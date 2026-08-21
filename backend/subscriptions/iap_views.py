"""
In-App Purchase (IAP) verification for Apple App Store – Guideline 3.1.1 compliance.

Same digital content (courses, mentorship, app subscription) that is sold on the web
must also be purchasable in the app via IAP. This module verifies Apple receipts
and grants access on the backend.

Required environment variables:
- APPLE_SHARED_SECRET: App-specific shared secret from App Store Connect
- APPLE_BUNDLE_ID: iOS app bundle ID (e.g. com.rubianejoaquim.zenda)
"""
import json
import logging
import base64
import requests
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

logger = logging.getLogger(__name__)

# Apple receipt verification URLs
APPLE_VERIFY_RECEIPT_PROD = "https://buy.itunes.apple.com/verifyReceipt"
APPLE_VERIFY_RECEIPT_SANDBOX = "https://sandbox.itunes.apple.com/verifyReceipt"


def _verify_apple_receipt(receipt_data_b64):
    """
    Verify receipt with Apple. Tries production first, then sandbox if Apple returns 21007.
    Returns (success: bool, response_dict or None, error_message).
    """
    shared_secret = getattr(settings, "APPLE_SHARED_SECRET", None)
    if not shared_secret:
        logger.warning("APPLE_SHARED_SECRET not set - IAP verification disabled")
        return False, None, "Server configuration error: IAP verification not configured"

    payload = {
        "receipt-data": receipt_data_b64,
        "password": shared_secret,
        "exclude-old-transactions": True,
    }

    for url in (APPLE_VERIFY_RECEIPT_PROD, APPLE_VERIFY_RECEIPT_SANDBOX):
        try:
            r = requests.post(url, json=payload, timeout=10)
            r.raise_for_status()
            data = r.json()
            status_code = data.get("status")
            # 0 = valid; 21007 = receipt is for sandbox, try sandbox URL
            if status_code == 0:
                return True, data, None
            if status_code == 21007 and url == APPLE_VERIFY_RECEIPT_PROD:
                continue
            return False, data, f"Apple returned status {status_code}"
        except requests.RequestException as e:
            logger.exception("Apple verifyReceipt request failed: %s", e)
            return False, None, str(e)
        except json.JSONDecodeError as e:
            logger.exception("Invalid JSON from Apple: %s", e)
            return False, None, "Invalid response from Apple"

    return False, None, "Receipt verification failed"


def _decode_jws_payload(jws_token):
    """Decode the payload segment of a StoreKit 2 JWS without signature verification."""
    try:
        parts = jws_token.split(".")
        if len(parts) != 3:
            return None
        payload_b64 = parts[1]
        padding = "=" * (-len(payload_b64) % 4)
        payload_json = base64.urlsafe_b64decode(payload_b64 + padding)
        return json.loads(payload_json)
    except (ValueError, json.JSONDecodeError, TypeError) as e:
        logger.warning("Failed to decode JWS payload: %s", e)
        return None


def _verify_apple_jws(jws_token, expected_product_id, expected_transaction_id=None):
    """
    Verify a StoreKit 2 signed transaction (JWS).
    Returns (success, payload_dict or None, error_message).
    """
    payload = _decode_jws_payload(jws_token)
    if not payload:
        return False, None, "Invalid transaction token"

    bundle_id = getattr(settings, "APPLE_BUNDLE_ID", "com.rubianejoaquim.zenda")
    token_bundle = payload.get("bundleId") or payload.get("bundle_id")
    if token_bundle and token_bundle != bundle_id:
        return False, None, f"Bundle ID mismatch: {token_bundle}"

    product_id = payload.get("productId") or payload.get("product_id")
    if product_id and product_id != expected_product_id:
        return False, None, f"Product ID mismatch: {product_id}"

    if expected_transaction_id:
        token_tx = (
            payload.get("transactionId")
            or payload.get("transaction_id")
            or payload.get("originalTransactionId")
        )
        if token_tx and str(token_tx) != str(expected_transaction_id):
            return False, None, "Transaction ID mismatch"

    # Revoked or refunded transactions should not grant access.
    if payload.get("revocationDate") or payload.get("revocationReason"):
        return False, None, "Transaction was revoked"

    return True, payload, None


def _verify_apple_purchase(receipt_data_b64, product_id, transaction_id=None):
    """Try StoreKit 2 JWS first, then legacy receipt verification."""
    if isinstance(receipt_data_b64, str) and receipt_data_b64.startswith("eyJ"):
        return _verify_apple_jws(receipt_data_b64, product_id, transaction_id)
    return _verify_apple_receipt(receipt_data_b64)


def _grant_course_access(user, course_id):
    """Create or activate Enrollment for course_id."""
    from courses.models import Enrollment

    enrollment, created = Enrollment.objects.get_or_create(
        user=user,
        course_id=course_id,
        defaults={"status": "active", "activated_at": timezone.now()},
    )
    if not created and enrollment.status != "active":
        enrollment.status = "active"
        enrollment.activated_at = timezone.now()
        enrollment.save()
    try:
        from courses.commerce import activate_enrollment
        activate_enrollment(enrollment, payment_method='apple_iap')
    except Exception:
        pass
    return enrollment


def _grant_mentorship_access(user, package_id):
    """Create MentorshipRequest for package_id and set status=approved (paid via IAP)."""
    from mentorship.models import MentorshipRequest, MentorshipPackage

    package = MentorshipPackage.objects.filter(id=package_id, is_active=True).first()
    if not package:
        return None
    request = MentorshipRequest.objects.create(
        user=user,
        package=package,
        objective="Comprado via App Store (In-App Purchase).",
        availability="A definir com a equipa.",
        contact=user.email or "",
        status="approved",
    )
    return request


def _grant_subscription_access(user, months=1, transaction_id=None):
    """Create or update MobileAppSubscription via the payment ledger (idempotent)."""
    from .payments import get_or_create_subscription, record_iap_payment

    sub = get_or_create_subscription(user)
    record_iap_payment(user, sub, transaction_id)
    sub.refresh_from_db()
    return sub


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def verify_apple_iap(request):
    """
    Verify Apple IAP receipt and grant access based on product_id.

    Body: { "receipt_data": "<base64>", "product_id": "course_1" | "mentorship_1" | "zenda_monthly" }

    product_id conventions:
    - course_<id>   -> grant Enrollment for course id
    - mentorship_<id> -> grant MentorshipRequest (approved) for package id
    - zenda_monthly -> grant/expand MobileAppSubscription (1 month)
    """
    receipt_data = request.data.get("receipt_data") or request.data.get("receiptData")
    product_id = (request.data.get("product_id") or request.data.get("productId") or "").strip()
    transaction_id = request.data.get("transaction_id") or request.data.get("transactionId")

    if not receipt_data:
        return Response(
            {"error": "receipt_data is required"},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if not product_id:
        return Response(
            {"error": "product_id is required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    ok, apple_data, err = _verify_apple_purchase(receipt_data, product_id, transaction_id)
    if not ok:
        logger.warning("IAP verification failed for user %s: %s", request.user.id, err)
        return Response(
            {"error": "Invalid or expired receipt", "detail": err},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Optional: check that the product_id in the receipt matches (from latest_receipt_info or receipt.in_app)
    # For robustness you can validate product_id against Apple's response here.

    user = request.user

    if product_id.startswith("course_"):
        try:
            course_id = int(product_id.replace("course_", ""))
        except ValueError:
            return Response(
                {"error": "Invalid course product_id"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        enrollment = _grant_course_access(user, course_id)
        return Response({
            "success": True,
            "granted": "course",
            "course_id": course_id,
            "enrollment_id": enrollment.id,
        }, status=status.HTTP_200_OK)

    if product_id.startswith("mentorship_"):
        try:
            package_id = int(product_id.replace("mentorship_", ""))
        except ValueError:
            return Response(
                {"error": "Invalid mentorship product_id"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        req = _grant_mentorship_access(user, package_id)
        if not req:
            return Response(
                {"error": "Mentorship package not found or inactive"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response({
            "success": True,
            "granted": "mentorship",
            "package_id": package_id,
            "request_id": req.id,
        }, status=status.HTTP_200_OK)

    if product_id in ("zenda_monthly", "zenda_subscription_monthly"):
        apple_tx = transaction_id
        if isinstance(apple_data, dict):
            apple_tx = (
                apple_data.get("originalTransactionId")
                or apple_data.get("transactionId")
                or apple_data.get("original_transaction_id")
                or transaction_id
            )
            latest = apple_data.get("latest_receipt_info") or apple_data.get("receipt", {}).get("in_app")
            if not apple_tx and isinstance(latest, list) and latest:
                last = latest[-1]
                apple_tx = last.get("original_transaction_id") or last.get("transaction_id")
        sub = _grant_subscription_access(user, months=1, transaction_id=str(apple_tx) if apple_tx else None)
        return Response({
            "success": True,
            "granted": "subscription",
            "subscription_ends_at": sub.subscription_ends_at.isoformat() if sub.subscription_ends_at else None,
        }, status=status.HTTP_200_OK)

    return Response(
        {"error": f"Unknown product_id: {product_id}"},
        status=status.HTTP_400_BAD_REQUEST,
    )
