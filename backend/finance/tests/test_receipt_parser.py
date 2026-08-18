"""Tests for receipt parser and expense-from-receipt flow."""
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from unittest.mock import patch

from finance.receipt_parser import parse_receipt_text
from finance.models import Receipt, Category, Budget
from finance.services import process_receipt_ocr, create_expense_from_receipt

User = get_user_model()


class ReceiptParserTests(TestCase):
    def test_extracts_total_and_currency_zar(self):
        text = """
        Shoprite
        2026-08-18
        Groceries
        TOTAL  R 1,250.50
        """
        parsed = parse_receipt_text(text, default_currency='AOA')
        self.assertEqual(parsed['merchant'], 'Shoprite')
        self.assertEqual(parsed['amount'], Decimal('1250.50'))
        self.assertEqual(parsed['currency'], 'ZAR')
        self.assertGreater(parsed['confidence_score'], Decimal('0'))

    def test_extracts_aoa_kz_total(self):
        text = """
        Shoprite Luanda
        18/08/2026
        Bread 1,500.00
        Milk 2,000.00
        SUBTOTAL 3,500.00
        TOTAL: 25,500.00 Kz
        """
        parsed = parse_receipt_text(text, default_currency='USD')
        self.assertEqual(parsed['amount'], Decimal('25500.00'))
        self.assertEqual(parsed['currency'], 'AOA')

    def test_prefers_payable_total_over_subtotal(self):
        text = """
        Merchant
        Item A 80.00
        SUBTOTAL 100.00
        Discount 20.00
        TOTAL 80.00
        """
        parsed = parse_receipt_text(text)
        self.assertEqual(parsed['amount'], Decimal('80.00'))

    def test_empty_text_fails_without_filename(self):
        parsed = parse_receipt_text('', default_currency='AOA')
        self.assertEqual(parsed['status'], 'failed')
        self.assertIsNone(parsed['amount'])

    def test_low_confidence_without_total(self):
        parsed = parse_receipt_text('Random text no amounts', default_currency='AOA')
        self.assertEqual(parsed['status'], 'failed')
        self.assertIsNone(parsed['amount'])


class CreateExpenseFromReceiptTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='rcpuser', password='testpass123')
        self.user.preferred_currency = 'AOA'
        self.user.save()
        self.category = Category.objects.create(name='Food', is_personal=True)
        self.budget = Budget.objects.create(
            user=self.user,
            category=self.category,
            amount=Decimal('5000'),
            currency='AOA',
            month=8,
            year=2026,
        )
        self.receipt = Receipt.objects.create(
            user=self.user,
            scanned_text='Shoprite\nTOTAL 1250.50 AOA',
            merchant='Shoprite',
            amount=Decimal('1250.50'),
            currency='AOA',
            status='processed',
            confidence_score=Decimal('0.85'),
        )

    def test_create_expense_links_receipt(self):
        expense, alerts = create_expense_from_receipt(
            self.receipt,
            category_id=self.category.id,
            budget_id=self.budget.id,
        )
        self.receipt.refresh_from_db()
        self.assertEqual(self.receipt.linked_expense_id, expense.id)
        self.assertEqual(expense.amount, Decimal('1250.50'))
        self.assertEqual(expense.budget_id, self.budget.id)
        self.assertIsNotNone(expense.converted_amount)

    def test_low_confidence_requires_confirmation(self):
        self.receipt.status = 'low_confidence'
        self.receipt.save()
        with self.assertRaises(ValueError):
            create_expense_from_receipt(self.receipt, category_id=self.category.id)

        expense, _ = create_expense_from_receipt(
            self.receipt,
            category_id=self.category.id,
            confirmed_low_confidence=True,
        )
        self.assertIsNotNone(expense.id)


class ReceiptOcrServiceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='ocruser', password='testpass123')

    def test_ocr_processing_from_scanned_text(self):
        receipt = Receipt.objects.create(
            user=self.user,
            scanned_text='Pick n Pay\nTOTAL R 1,250.50',
        )
        process_receipt_ocr(receipt)
        receipt.refresh_from_db()
        self.assertEqual(receipt.amount, Decimal('1250.50'))
        self.assertEqual(receipt.currency, 'ZAR')
        self.assertEqual(receipt.status, 'processed')

    def test_empty_scan_does_not_use_filename(self):
        receipt = Receipt.objects.create(
            user=self.user,
            scanned_text='',
            file='receipts/2026/08/total-99999.jpg',
        )
        with patch('finance.receipt_vision.extract_receipt_with_vision', return_value=None):
            process_receipt_ocr(receipt)
        receipt.refresh_from_db()
        self.assertEqual(receipt.status, 'failed')
        self.assertIsNone(receipt.amount)

    def test_receipt_upload_api_parses_total(self):
        from rest_framework.test import APIClient
        from rest_framework.authtoken.models import Token

        token = Token.objects.create(user=self.user)
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
        resp = client.post(
            '/api/finance/receipts/',
            {
                'file': SimpleUploadedFile('receipt.jpg', b'\xff\xd8\xff', content_type='image/jpeg'),
                'scanned_text': 'Shoprite\nTOTAL: 25,500.00 Kz',
            },
            format='multipart',
        )
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(Decimal(str(resp.data['amount'])), Decimal('25500.00'))
        self.assertEqual(resp.data['currency'], 'AOA')
