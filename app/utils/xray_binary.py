import json
import re
import subprocess

from config import XRAY_EXECUTABLE_PATH


def get_x25519(private_key: str = None):
    cmd = [XRAY_EXECUTABLE_PATH, "x25519"]
    if private_key:
        cmd.extend(["-i", private_key])

    output = subprocess.check_output(cmd, stderr=subprocess.STDOUT).decode("utf-8")
    private_match = re.search(
        r"^\s*Private(?:\s+key|Key)\s*:\s*(\S+)\s*$",
        output,
        flags=re.IGNORECASE | re.MULTILINE,
    )
    public_match = re.search(
        r"^\s*(?:Public\s+key|Password\s*\(\s*PublicKey\s*\))\s*:\s*(\S+)\s*$",
        output,
        flags=re.IGNORECASE | re.MULTILINE,
    )
    if private_match and public_match:
        return {
            "private_key": private_match.group(1),
            "public_key": public_match.group(1),
        }


def get_tls_certificate(server_name: str | None = None) -> dict[str, list[str]]:
    cmd = [XRAY_EXECUTABLE_PATH, "tls", "cert", "--json"]
    if server_name:
        cmd.append(f"--domain={server_name}")

    try:
        output = subprocess.check_output(cmd, stderr=subprocess.STDOUT).decode("utf-8")
    except (OSError, subprocess.CalledProcessError) as exc:
        raise ValueError("Unable to generate TLS certificate") from exc

    try:
        payload = json.loads(output)
    except json.JSONDecodeError as exc:
        raise ValueError("Xray returned invalid TLS certificate data") from exc

    certificate = payload.get("certificate")
    key = payload.get("key")
    if (
        not _is_pem_lines(certificate, "CERTIFICATE")
        or not _is_pem_lines(key, "PRIVATE KEY")
    ):
        raise ValueError("Xray returned invalid TLS certificate data")

    return {"certificate": certificate, "key": key}


def _is_pem_lines(value: object, pem_type: str) -> bool:
    if (
        not isinstance(value, list)
        or not value
        or not all(isinstance(line, str) for line in value)
    ):
        return False

    pem = "\n".join(value)
    if pem_type == "PRIVATE KEY":
        return bool(
            re.search(
                r"-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY-----.*-----END (?:[A-Z0-9]+ )*PRIVATE KEY-----",
                pem,
                flags=re.DOTALL,
            )
        )

    return f"-----BEGIN {pem_type}-----" in pem and f"-----END {pem_type}-----" in pem
