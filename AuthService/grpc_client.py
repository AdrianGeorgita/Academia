import grpc
import auth_pb2
import auth_pb2_grpc

import json

from typing import Annotated

from re import match

from fastapi import FastAPI, Body, Response, HTTPException, Request, Header
from fastapi.middleware.cors import CORSMiddleware

from pydantic import BaseModel

import hashlib

app = FastAPI()

origins = [
    "http://localhost:8000",
    "http://localhost:8004",
    "http://localhost:8008",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["POST"],
    allow_headers=["authorization", "content-type"],
)

email_regex = r"^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$"

class RegisterRequest(BaseModel):
    username: str
    password: str
    role: str

def ValidateIdentity(token: str):
    if not token.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization header invalid or not present")
    else:
        jws = token.split("Bearer ")[1]

        with grpc.insecure_channel("auth_service:50051") as channel:
            stub = auth_pb2_grpc.AuthenticationStub(channel)
            response = stub.Validate(auth_pb2.ValidationRequest(jws=jws))

        res_split = response.status.split('\n')

        if res_split[0] == "Success":
            if res_split[1] == "Valid Token":
                res_json = json.loads(res_split[2])
                return res_json["role"], res_json["sub"]
            else:
                raise HTTPException(status_code=401, detail=res_split[1])
        else:
            raise HTTPException(status_code=401, detail=res_split[1])

def InvalidateToken(token: str):
    ValidateIdentity(token)
    with grpc.insecure_channel("localhost:50051") as channel:
        stub = auth_pb2_grpc.AuthenticationStub(channel)
        response = stub.Invalidate(auth_pb2.InvalidationRequest(jws=token))

        return response

def Register(username: str, password: str, role: str):
    with grpc.insecure_channel("localhost:50051") as channel:
        stub = auth_pb2_grpc.AuthenticationStub(channel)
        response = stub.Register(auth_pb2.RegistrationRequest(username=username, password=password, role=role))

        return response.status, response.uid

@app.post("/api/academia/login", status_code=201, responses=(
        {
            500: {"description": "Internal Server Error"},
        }
    )
)
def login(
        request: Request,
        response: Response,
        email: str = Body(...),
        password: str = Body(...),
):
    try:
        if not match(email_regex, email.strip()):
            response.status_code = 422
            return {"error": "Invalid email"}

        with grpc.insecure_channel("localhost:50051") as channel:
            stub = auth_pb2_grpc.AuthenticationStub(channel)
            response = stub.Authenticate(auth_pb2.AuthenticationRequest(username=email, password=password))

        role, uid = ValidateIdentity("Bearer " + response.jws)

        home_page = ""
        profile_page = ""
        if role == "student":
            home_page = f"http://localhost:8000/api/academia/students/{uid}/lectures"
            profile_page = f"http://localhost:8000/api/academia/students/{uid}"
        elif role == "profesor":
            #home_page = f"http://localhost:8000/api/academia/teachers/{uid}/lectures"
            home_page = f"http://localhost:8000/api/academia/lectures"
            profile_page = f"http://localhost:8000/api/academia/teachers/{uid}"
        elif role == "admin":
            home_page = f"http://localhost:8000/api/academia/stats"

        return {
            "token": response.jws,
            "_links": {
                "self": {
                    "href": request.url.path,
                    "method": "POST",
                },
                "logout": {
                    "href": ('/'.join(request.url.path.split('/')[:-1]) + '/logout'),
                    "method": "POST",
                },
                "home_page": {
                    "href": home_page,
                    "method": "GET",
                },
                "profile_page": {
                    "href": profile_page,
                    "method": "GET",
                }
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error logging in: {e}")


@app.post("/api/academia/logout", status_code=201, responses=(
        {
            500: {"description": "Internal Server Error"},
        }
    )
)
def logout(
        request: Request,
        authorization: Annotated[str, Header()],
):
    try:
        status = InvalidateToken(authorization).status

        return {
            "status": status,
            "_links": {
                "self": {
                    "href": request.url.path,
                    "method": "POST",
                },
                "login": {
                    "href": ('/'.join(request.url.path.split('/')[:-1]) + '/login'),
                    "method": "POST",
                }
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error logging out: {e}")


@app.post("/api/academia/register", status_code=201, responses=(
        {
            500: {"description": "Internal Server Error"},
            422: {"description": "Unprocessable Content"},
        }
    )
)
def register(
        authorization: Annotated[str, Header()],
        body: RegisterRequest = Body(...),
):
    user_role, uid = ValidateIdentity(authorization)
    if user_role != "admin":
        raise HTTPException(status_code=403, detail="You aren't authorized to access this resource")

    if not match(email_regex, body.username.strip()):
        raise HTTPException(status_code=422, detail="Invalid email")

    if body.role.strip() not in ["profesor", "student"]:
        raise HTTPException(status_code=422, detail="Invalid role")

    status, uid = Register(body.username.strip(), body.password, body.role.strip())

    if status != "Success":
        raise HTTPException(status_code=500, detail=f"Error registering user!")

    return {"uid": int(uid)}



