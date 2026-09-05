import os
import hmac
import hashlib
import time
import logging
from typing import Any

logger = logging.getLogger("termwise.razorpay")


class RazorpayService:
    """
    Isolated Razorpay Integration Service.
    Encapsulates all Razorpay API client interactions, signature verification,
    mocking, and error handling.
    """

    def __init__(self):
        self._key_id = os.environ.get("RAZORPAY_KEY_ID", "").strip()
        self._key_secret = os.environ.get("RAZORPAY_KEY_SECRET", "").strip()
        self._webhook_secret = os.environ.get("RAZORPAY_WEBHOOK_SECRET", "").strip()
        self._mock_mode_env = os.environ.get("MOCK_RAZORPAY", "").lower() in ("true", "1", "yes")

    def _refresh_env(self):
        self._key_id = os.environ.get("RAZORPAY_KEY_ID", "").strip()
        self._key_secret = os.environ.get("RAZORPAY_KEY_SECRET", "").strip()
        self._webhook_secret = os.environ.get("RAZORPAY_WEBHOOK_SECRET", "").strip()
        self._mock_mode_env = os.environ.get("MOCK_RAZORPAY", "").lower() in ("true", "1", "yes")

    def is_configured(self) -> bool:
        """
        Returns True if real, non-placeholder credentials are provided.
        """
        self._refresh_env()
        if not self._key_id or not self._key_secret:
            return False
        if "your_key_id" in self._key_id.lower() or "your_razorpay_secret" in self._key_secret.lower():
            return False
        return True

    def is_mock_mode(self) -> bool:
        """
        Returns True if explicitly set to mock mode or if credentials are missing.
        """
        self._refresh_env()
        if self._mock_mode_env:
            return True
        return not self.is_configured()

    def get_masked_key_id(self) -> str | None:
        if not self._key_id:
            return None
        if len(self._key_id) <= 8:
            return "****"
        return f"{self._key_id[:4]}...{self._key_id[-4:]}"

    def get_status(self) -> dict[str, Any]:
        """
        Returns public-safe integration metadata.
        Never returns secret keys or webhook secrets.
        """
        configured = self.is_configured()
        mode = "LIVE" if configured and not self._mock_mode_env else "DEMO"
        
        if mode == "LIVE":
            msg = "Razorpay live API connected and active"
        elif self._mock_mode_env and configured:
            mode = "MOCK_LIVE"
            msg = "Mock Razorpay mode active for testing"
        else:
            msg = "Demo Mode active. Running with synthetic payment data."

        return {
            "configured": configured,
            "mode": mode,
            "message": msg,
            "key_id": self.get_masked_key_id()
        }

    def fetch_payments(self, count: int = 50, skip: int = 0) -> list[dict[str, Any]]:
        """
        Fetch payments list. Uses bounded retry (up to 2 retries) with safe error handling.
        """
        self._refresh_env()
        
        if self.is_mock_mode():
            return self._get_mock_payments()

        # Attempt live call with bounded retry
        max_retries = 2
        for attempt in range(max_retries + 1):
            try:
                import requests
                url = "https://api.razorpay.com/v1/payments"
                resp = requests.get(
                    url,
                    auth=(self._key_id, self._key_secret),
                    params={"count": count, "skip": skip},
                    timeout=5.0
                )
                if resp.status_code == 200:
                    data = resp.json()
                    return data.get("items", [])
                elif resp.status_code in (401, 403):
                    logger.error("Razorpay authentication failed: Invalid Key ID or Secret")
                    return []
                else:
                    logger.warning(f"Razorpay API returned status {resp.status_code}")
            except Exception as e:
                logger.warning(f"Razorpay API request failed (attempt {attempt+1}/{max_retries+1}): {e}")
                if attempt < max_retries:
                    time.sleep(0.5)
                else:
                    logger.error("Max retries exceeded fetching Razorpay payments")
        return []

    def fetch_payment(self, payment_id: str) -> dict[str, Any] | None:
        """
        Fetch single payment details by ID.
        """
        self._refresh_env()
        
        if self.is_mock_mode():
            for p in self._get_mock_payments():
                if p["id"] == payment_id:
                    return p
            return None

        try:
            import requests
            url = f"https://api.razorpay.com/v1/payments/{payment_id}"
            resp = requests.get(
                url,
                auth=(self._key_id, self._key_secret),
                timeout=5.0
            )
            if resp.status_code == 200:
                return resp.json()
            return None
        except Exception as e:
            logger.error(f"Failed to fetch payment {payment_id}: {e}")
            return None

    def verify_webhook_signature(self, payload_body: bytes | str, signature: str) -> bool:
        """
        Official Razorpay HMAC-SHA256 signature verification.
        Validates that the webhook payload was signed with RAZORPAY_WEBHOOK_SECRET.
        """
        self._refresh_env()
        if not self._webhook_secret:
            logger.warning("Webhook verification failed: RAZORPAY_WEBHOOK_SECRET is not configured.")
            return False

        if not signature:
            return False

        try:
            if isinstance(payload_body, str):
                payload_body = payload_body.encode("utf-8")

            expected_signature = hmac.new(
                self._webhook_secret.encode("utf-8"),
                payload_body,
                hashlib.sha256
            ).hexdigest()

            return hmac.compare_digest(expected_signature, signature.strip())
        except Exception as e:
            logger.error(f"Error during webhook signature verification: {e}")
            return False

    def _get_mock_payments(self) -> list[dict[str, Any]]:
        """
        Deterministic mock Razorpay payments for test and simulation environments.
        Amount is in paise (1 INR = 100 paise) matching Razorpay API standard.
        """
        return [
            {
                "id": "pay_mock_001",
                "entity": "payment",
                "amount": 25000000,  # 250,000 INR
                "currency": "INR",
                "status": "captured",
                "order_id": "order_mock_001",
                "method": "netbanking",
                "created_at": 1725150000,
                "notes": {
                    "invoice_id": "INV-2024-001",
                    "buyer_name": "ABC Industries"
                }
            },
            {
                "id": "pay_mock_002",
                "entity": "payment",
                "amount": 10000000,  # 100,000 INR (partial payment 1)
                "currency": "INR",
                "status": "captured",
                "order_id": "order_mock_002",
                "method": "bank_transfer",
                "created_at": 1725200000,
                "notes": {
                    "invoice_id": "INV-2024-002",
                    "buyer_name": "XYZ Manufacturing"
                }
            },
            {
                "id": "pay_mock_003",
                "entity": "payment",
                "amount": 12000000,  # 120,000 INR (partial payment 2)
                "currency": "INR",
                "status": "captured",
                "order_id": "order_mock_003",
                "method": "bank_transfer",
                "created_at": 1725300000,
                "notes": {
                    "invoice_id": "INV-2024-002",
                    "buyer_name": "XYZ Manufacturing"
                }
            },
            {
                "id": "pay_mock_004",
                "entity": "payment",
                "amount": 18000000,  # 180,000 INR
                "currency": "INR",
                "status": "failed",
                "order_id": "order_mock_004",
                "method": "card",
                "created_at": 1725350000,
                "error_code": "BAD_REQUEST_ERROR",
                "error_description": "Payment was declined by issuing bank",
                "notes": {
                    "invoice_id": "INV-2024-003",
                    "buyer_name": "Global Traders"
                }
            }
        ]


# Singleton instance for dependency injection
razorpay_service = RazorpayService()
