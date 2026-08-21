from django.db import models

from .crypto import decrypt_secret, encrypt_secret


class EncryptedTextField(models.TextField):
    """Stores ciphertext in the database; exposes plaintext on the model instance."""

    def from_db_value(self, value, expression, connection):
        if not value:
            return ''
        return decrypt_secret(value)

    def to_python(self, value):
        if value is None:
            return ''
        return value

    def get_prep_value(self, value):
        if not value:
            return ''
        return encrypt_secret(value)
