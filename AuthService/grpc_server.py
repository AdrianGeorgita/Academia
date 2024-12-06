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

class Blacklist(BaseModel):
    jws = CharField(primary_key=True)

    class Meta:
        db_table = 'blacklist'

def isBlacklisted(jws: str):
    res = Blacklist.select().where(Blacklist.jws == jws)
    if res.count() == 1:
        return True
    return False

class AuthenticationService(auth_pb2_grpc.Authentication):
    def Authenticate(self, request, context):
        passwd_hash = hashlib.md5(request.password.encode()).hexdigest()

        res = User.select().where((User.email == request.username) & (User.parola == passwd_hash))

        jws = None
        if res.count() == 1:
            payload = {
                "iss": "URL HERE",     # GET URL of service that requested the token
                "sub": str(res.first().ID),
                "exp": round(time.time()) + 43200,     # 12 hours
                "jti": str(uuid.uuid4()),
                "role": res.first().rol
            }

            jws = jwt.encode(payload=payload, key=JWT_SECRET, algorithm=JWT_ALGORITHM)

        return auth_pb2.AuthenticationResponse(jws=jws)

    def Invalidate(self, request, context):
        try:
            Blacklist.insert({
                "jws": request.jws,
            }).execute()
            status = "Invalidated"
        except Exception as e:
            print(e)
            status = "Failed to invalidate\n" + e

        return auth_pb2.InvalidationResponse(status=status)

    def Validate(self, request, context):
        encoded_jwt = request.jws
        status = "Validated"

        if not isBlacklisted(encoded_jwt):
            try:
                payload = jwt.decode(jwt=encoded_jwt, key=JWT_SECRET, algorithms=[JWT_ALGORITHM],
                                     options={'verify_exp': True})
                body = '\n{"sub": "' + payload["sub"] + '", "role":"' + payload["role"] + '"}'
            except Exception as e:
                body = "\n" + str(e)
                print(e)
        else:
            body = "\nBlacklisted"

        return auth_pb2.ValidationResponse(status=status + body)

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