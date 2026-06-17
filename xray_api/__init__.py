from . import exceptions
from . import exceptions as exc
from . import types
from .proxyman import Proxyman
from .routing import Routing
from .stats import Stats


class XRay(Proxyman, Routing, Stats):
    pass


__all__ = [
    "XRay",
    "exceptions",
    "exc",
    "types"
]
