import subprocess
from unittest import TestCase
from unittest.mock import patch

from app.services.core_service import generate_tls_certificate
from app.models.core import CoreTlsCertificateRequest
from app.utils import xray_binary


TLS_CERTIFICATE_JSON = b'''{
  "certificate": [
    "-----BEGIN CERTIFICATE-----",
    "certificate-data",
    "-----END CERTIFICATE-----"
  ],
  "key": [
    "-----BEGIN RSA PRIVATE KEY-----",
    "key-data",
    "-----END RSA PRIVATE KEY-----"
  ]
}'''


class XrayBinaryTests(TestCase):
    @patch("app.utils.xray_binary.subprocess.check_output")
    def test_get_tls_certificate_passes_domain_to_xray(self, check_output):
        check_output.return_value = TLS_CERTIFICATE_JSON

        result = xray_binary.get_tls_certificate("example.com")

        self.assertEqual(result["certificate"][1], "certificate-data")
        self.assertEqual(result["key"][1], "key-data")
        check_output.assert_called_once_with(
            [
                xray_binary.XRAY_EXECUTABLE_PATH,
                "tls",
                "cert",
                "--json",
                "--domain=example.com",
            ],
            stderr=subprocess.STDOUT,
        )

    @patch("app.utils.xray_binary.subprocess.check_output")
    def test_get_tls_certificate_without_domain_omits_domain_flag(self, check_output):
        check_output.return_value = TLS_CERTIFICATE_JSON

        xray_binary.get_tls_certificate()

        check_output.assert_called_once_with(
            [xray_binary.XRAY_EXECUTABLE_PATH, "tls", "cert", "--json"],
            stderr=subprocess.STDOUT,
        )

    @patch(
        "app.utils.xray_binary.subprocess.check_output",
        side_effect=subprocess.CalledProcessError(1, ["xray"]),
    )
    def test_get_tls_certificate_raises_for_xray_error(self, _):
        with self.assertRaisesRegex(ValueError, "Unable to generate TLS certificate"):
            xray_binary.get_tls_certificate()

    @patch("app.utils.xray_binary.subprocess.check_output", return_value=b"{}")
    def test_get_tls_certificate_rejects_invalid_pem_data(self, _):
        with self.assertRaisesRegex(ValueError, "invalid TLS certificate data"):
            xray_binary.get_tls_certificate()

    @patch("app.utils.xray_binary.subprocess.check_output")
    def test_get_tls_certificate_accepts_ec_private_key(self, check_output):
        check_output.return_value = TLS_CERTIFICATE_JSON.replace(
            b"RSA PRIVATE KEY", b"EC PRIVATE KEY"
        )

        result = xray_binary.get_tls_certificate()

        self.assertEqual(result["key"][0], "-----BEGIN EC PRIVATE KEY-----")

    @patch("app.services.core_service.get_tls_certificate")
    def test_generate_tls_certificate_passes_normalized_server_name(self, get_certificate):
        get_certificate.return_value = {
            "certificate": [
                "-----BEGIN CERTIFICATE-----",
                "certificate-data",
                "-----END CERTIFICATE-----",
            ],
            "key": [
                "-----BEGIN PRIVATE KEY-----",
                "key-data",
                "-----END PRIVATE KEY-----",
            ],
        }

        response = generate_tls_certificate(
            CoreTlsCertificateRequest(server_name=" Example.COM. "),
            None,
        )

        self.assertEqual(response.certificate[1], "certificate-data")
        get_certificate.assert_called_once_with("example.com")
