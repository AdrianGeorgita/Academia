# -*- coding: utf-8 -*-
# Generated by the protocol buffer compiler.  DO NOT EDIT!
# NO CHECKED-IN PROTOBUF GENCODE
# source: auth.proto
# Protobuf Python Version: 5.29.0
"""Generated protocol buffer code."""
from google.protobuf import descriptor as _descriptor
from google.protobuf import descriptor_pool as _descriptor_pool
from google.protobuf import runtime_version as _runtime_version
from google.protobuf import symbol_database as _symbol_database
from google.protobuf.internal import builder as _builder
_runtime_version.ValidateProtobufRuntimeVersion(
    _runtime_version.Domain.PUBLIC,
    5,
    29,
    0,
    '',
    'auth.proto'
)
# @@protoc_insertion_point(imports)

_sym_db = _symbol_database.Default()




DESCRIPTOR = _descriptor_pool.Default().AddSerializedFile(b'\n\nauth.proto\x12\x04\x61uth\";\n\x15\x41uthenticationRequest\x12\x10\n\x08username\x18\x01 \x01(\t\x12\x10\n\x08password\x18\x02 \x01(\t\"%\n\x16\x41uthenticationResponse\x12\x0b\n\x03jws\x18\x01 \x01(\t\" \n\x11ValidationRequest\x12\x0b\n\x03jws\x18\x01 \x01(\t\"$\n\x12ValidationResponse\x12\x0e\n\x06status\x18\x01 \x01(\t\"\"\n\x13InvalidationRequest\x12\x0b\n\x03jws\x18\x01 \x01(\t\"&\n\x14InvalidationResponse\x12\x0e\n\x06status\x18\x01 \x01(\t\"G\n\x13RegistrationRequest\x12\x10\n\x08username\x18\x01 \x01(\t\x12\x10\n\x08password\x18\x02 \x01(\t\x12\x0c\n\x04role\x18\x03 \x01(\t\"3\n\x14RegistrationResponse\x12\x0e\n\x06status\x18\x01 \x01(\t\x12\x0b\n\x03uid\x18\x02 \x01(\t2\xaa\x02\n\x0e\x41uthentication\x12K\n\x0c\x41uthenticate\x12\x1b.auth.AuthenticationRequest\x1a\x1c.auth.AuthenticationResponse\"\x00\x12?\n\x08Validate\x12\x17.auth.ValidationRequest\x1a\x18.auth.ValidationResponse\"\x00\x12\x45\n\nInvalidate\x12\x19.auth.InvalidationRequest\x1a\x1a.auth.InvalidationResponse\"\x00\x12\x43\n\x08Register\x12\x19.auth.RegistrationRequest\x1a\x1a.auth.RegistrationResponse\"\x00\x62\x06proto3')

_globals = globals()
_builder.BuildMessageAndEnumDescriptors(DESCRIPTOR, _globals)
_builder.BuildTopDescriptorsAndMessages(DESCRIPTOR, 'auth_pb2', _globals)
if not _descriptor._USE_C_DESCRIPTORS:
  DESCRIPTOR._loaded_options = None
  _globals['_AUTHENTICATIONREQUEST']._serialized_start=20
  _globals['_AUTHENTICATIONREQUEST']._serialized_end=79
  _globals['_AUTHENTICATIONRESPONSE']._serialized_start=81
  _globals['_AUTHENTICATIONRESPONSE']._serialized_end=118
  _globals['_VALIDATIONREQUEST']._serialized_start=120
  _globals['_VALIDATIONREQUEST']._serialized_end=152
  _globals['_VALIDATIONRESPONSE']._serialized_start=154
  _globals['_VALIDATIONRESPONSE']._serialized_end=190
  _globals['_INVALIDATIONREQUEST']._serialized_start=192
  _globals['_INVALIDATIONREQUEST']._serialized_end=226
  _globals['_INVALIDATIONRESPONSE']._serialized_start=228
  _globals['_INVALIDATIONRESPONSE']._serialized_end=266
  _globals['_REGISTRATIONREQUEST']._serialized_start=268
  _globals['_REGISTRATIONREQUEST']._serialized_end=339
  _globals['_REGISTRATIONRESPONSE']._serialized_start=341
  _globals['_REGISTRATIONRESPONSE']._serialized_end=392
  _globals['_AUTHENTICATION']._serialized_start=395
  _globals['_AUTHENTICATION']._serialized_end=693
# @@protoc_insertion_point(module_scope)
