from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from typing import ClassVar as _ClassVar, Optional as _Optional

DESCRIPTOR: _descriptor.FileDescriptor

class AuthenticationRequest(_message.Message):
    __slots__ = ("username", "password")
    USERNAME_FIELD_NUMBER: _ClassVar[int]
    PASSWORD_FIELD_NUMBER: _ClassVar[int]
    username: str
    password: str
    def __init__(self, username: _Optional[str] = ..., password: _Optional[str] = ...) -> None: ...

class AuthenticationResponse(_message.Message):
    __slots__ = ("jws",)
    JWS_FIELD_NUMBER: _ClassVar[int]
    jws: str
    def __init__(self, jws: _Optional[str] = ...) -> None: ...

class ValidationRequest(_message.Message):
    __slots__ = ("jws",)
    JWS_FIELD_NUMBER: _ClassVar[int]
    jws: str
    def __init__(self, jws: _Optional[str] = ...) -> None: ...

class ValidationResponse(_message.Message):
    __slots__ = ("status",)
    STATUS_FIELD_NUMBER: _ClassVar[int]
    status: str
    def __init__(self, status: _Optional[str] = ...) -> None: ...

class InvalidationRequest(_message.Message):
    __slots__ = ("jws",)
    JWS_FIELD_NUMBER: _ClassVar[int]
    jws: str
    def __init__(self, jws: _Optional[str] = ...) -> None: ...

class InvalidationResponse(_message.Message):
    __slots__ = ("status",)
    STATUS_FIELD_NUMBER: _ClassVar[int]
    status: str
    def __init__(self, status: _Optional[str] = ...) -> None: ...
