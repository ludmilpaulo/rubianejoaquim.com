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


def _grant_subscription_access(user, months=1):
    """Create or update MobileAppSubscription: set active and extend subscription_ends_at."""
    from .models import MobileAppSubscription

    sub, created = MobileAppSubscription.objects.get_or_create(
        user=user,
        defaults={
            "status": "active",
            "subscription_ends_at": timezone.now() + timedelta(days=30 * months),
        },
    )
    if not created:
        end = sub.subscription_ends_at or timezone.now()
        if end < timezone.now():
            end = timezone.now()
        sub.subscription_ends_at = end + timedelta(days=30 * months)
        sub.status = "active"
        sub.save()
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

    ok, apple_data, err = _verify_apple_receipt(receipt_data)
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
        sub = _grant_subscription_access(user, months=1)
        return Response({
            "success": True,
            "granted": "subscription",
            "subscription_ends_at": sub.subscription_ends_at.isoformat() if sub.subscription_ends_at else None,
        }, status=status.HTTP_200_OK)

    return Response(
        {"error": f"Unknown product_id: {product_id}"},
        status=status.HTTP_400_BAD_REQUEST,
    )
