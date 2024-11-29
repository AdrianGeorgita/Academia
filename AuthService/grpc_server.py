import uuid
from concurrent import futures
import grpc
import auth_pb2
import auth_pb2_grpc
import jwt
import time
import hashlib

from peewee import MySQLDatabase
from peewee import Model, CharField, IntegerField, ForeignKeyField, CompositeKey

db = MySQLDatabase(database='auth', user='authAdmin', passwd='passwdauth', host='localhost', port=3308)

db.connect()

JWT_ALGORITHM = "HS256"
JWT_SECRET = "test"

class BaseModel(Model):
    class Meta:
        database = db


class User(BaseModel):
    ID = IntegerField(primary_key=True)
    email = CharField(unique=True)
    parola = CharField()
    rol = CharField()

    class Meta:
        db_table = 'utilizator'

class AuthenticationService(auth_pb2_grpc.Authentication):
    def Authenticate(self, request, context):
        passwd_hash = hashlib.md5(request.password.encode()).hexdigest()
        print(passwd_hash)      # for testing

        res = User.select().where((User.email == request.username) & (User.parola == passwd_hash))

        jwt_token = None
        if res.count() == 1:
            payload = {
                "iss": "URL HERE",     # GET URL of service that requested the token
                "sub": res.first().ID,
                "exp": str(round(time.time()) + 43200),     # 12 hours
                "jti": str(uuid.uuid4()),
                "role": res.first().rol
            }

            jwt_token = jwt.encode(payload=payload, key=JWT_SECRET, algorithm=JWT_ALGORITHM)

        return auth_pb2.AuthenticationResponse(jws=jwt_token)

    def Validate(self, request, context):
        status = "Failed"

        encoded_jwt = request.jws
        decoded_jwt = jwt.decode(encoded_jwt, key=JWT_SECRET, algorithms=JWT_ALGORITHM)

        print(decoded_jwt)

        return auth_pb2.ValidationResponse(status=status)

def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    auth_pb2_grpc.add_AuthenticationServicer_to_server(
        AuthenticationService(),
        server
    )

    server.add_insecure_port('[::]:50051')

    server.start()
    print("running on 5005...")
    server.wait_for_termination()


if __name__ == '__main__':
    serve()