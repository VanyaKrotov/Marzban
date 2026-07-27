import unittest

from app.utils.xray_config_template import normalize_xray_config_template


class XRayConfigTemplateTests(unittest.TestCase):
    def test_accepts_template_without_inbounds(self):
        template = {
            "outbounds": [
                {
                    "protocol": "freedom",
                    "tag": "DIRECT",
                }
            ]
        }

        normalized = normalize_xray_config_template(template, api_port=8080)

        self.assertEqual(normalized, template)

    def test_requires_outbounds_when_inbounds_are_absent(self):
        with self.assertRaisesRegex(Exception, "config doesn't have outbounds"):
            normalize_xray_config_template({}, api_port=8080)
