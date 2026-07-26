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
