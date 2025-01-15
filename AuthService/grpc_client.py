import grpc
import auth_pb2
import auth_pb2_grpc


def consume(username, password):
    with grpc.insecure_channel("localhost:50051") as channel:
        stub = auth_pb2_grpc.AuthenticationStub(channel)
        response = stub.Authenticate(auth_pb2.AuthenticationRequest(username=username, password=password))

    print("Result: " + str(response.jws))


if __name__ == '__main__':
    user = input("Enter username: ")
    passwd = input("Enter password: ")
    consume(user, passwd)
