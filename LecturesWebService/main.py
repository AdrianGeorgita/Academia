import base64
import json
from math import ceil

from typing import Annotated

from fastapi import FastAPI
from fastapi import Request, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from bson.json_util import dumps
import pymongo

import requests

import grpc
import auth_pb2, auth_pb2_grpc

app = FastAPI()

mongodb_uri = ("mongodb://dbAdmin:7dddb0ee38fa7f35cb9f33d501c4b77c6088de8535a2232183bebdfe34073443@lectures_db:27017")
client = pymongo.MongoClient(mongodb_uri)
db = client["academia"]
pos_collection = db["lectures"]

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


default_responses = {
    401: {"description": "Unauthorized"},
    403: {"description": "Forbidden"},
    500: {"description": "Internal Server Error"},
}

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
    allow_methods=["GET", "PUT", "POST"],
    allow_headers=["authorization", "content-type"],
)

MAX_ITEMS_PER_PAGE = 100

@app.get("/")
async def root():
    return {"message": "Hello World"}


@app.get("/api/academia/materials", responses=(
        {
            **default_responses,
            416: {
                "description": "Range Not Satisfiable",
                "content": {
                    "application/json": {
                        "example": {"detail": {"max_page": 1, "items_per_page": 5}}
                    }
                }
            },
        }
    )
)
async def get_materials(
        request: Request,
        authorization: Annotated[str, Header()],
        page: int = 1,
        items_per_page: int = 10
):

    role, uid = ValidateIdentity(authorization)
    if (role not in ["profesor"]):
        raise HTTPException(status_code=403, detail="You aren't authorized to access this resource")

    if page < 1:
        raise HTTPException(status_code=422, detail="Page number must be positive!")
    if items_per_page < 1 or items_per_page > MAX_ITEMS_PER_PAGE:
        raise HTTPException(status_code=422, detail="Items per page must be positive and smaller than 100!")

    start_index = (page - 1) * items_per_page
    total_items = pos_collection.count_documents({})
    total_pages = ceil(total_items / items_per_page)

    if start_index >= total_items:
        raise HTTPException(status_code=416, detail={"max_page": total_pages,
                                                      "items_per_page": items_per_page})

    collection = pos_collection.find({}).skip(start_index).limit(items_per_page)
    materials = json.loads(dumps(collection))

    links = {
        "self": {
            "href": request.url.path,
            "method": "GET",
        },
        "parent": {
            "href": '/'.join(request.url.path.split('/')[:-1]),
            "method": "GET",
        }
    }

    if page > 1:
        links["first_page"] = {
            "href": f"{request.url.path}?page=1&items_per_page={items_per_page}",
            "method": "GET"
        }
        links["previous_page"] = {
            "href": f"{request.url.path}?page={page - 1}&items_per_page={items_per_page}",
            "method": "GET"
        }

    if page < total_pages:
        links["next_page"] = {
            "href": f"{request.url.path}?page={page + 1}&items_per_page={items_per_page}",
            "method": "GET"
        }
        links["last_page"] = {
            "href": f"{request.url.path}?page={total_pages}&items_per_page={items_per_page}",
            "method": "GET"
        }

    return {
        "materials": materials,
        "_links": links
    }


@app.get("/api/academia/materials/{course}")
async def get_course_materials(course: str, request: Request, authorization: Annotated[str, Header()],):

    role, uid = ValidateIdentity(authorization)

    url = f"http://study_web_service:8000/api/academia/lectures/authorization/{course.strip()}?method=GET"
    headers = {"Authorization": authorization}
    response = requests.get(url, headers=headers)

    if response.status_code == 200:
        data = response.json()

        if data["status"] not in ["authorized", "owner"]:
             raise HTTPException(status_code=403, detail="You aren't authorized to access this resource")

        collection = pos_collection.find_one({"disciplina": course.strip()})
        materials = json.loads(dumps(collection))

        dictionary = {
            "materials": materials,
            "_links": {
                "self": {
                    "href": request.url.path,
                    "method": "GET",
                },
                "parent": {
                    "href": '/'.join(request.url.path.split('/')[:-1]),
                    "method": "GET",
                },
            }
        }

        if data["status"] == "owner":
            dictionary["_links"]["update"] = {
                "href": request.url.path,
                "method": "PUT",
            }
            dictionary["_links"]["create"] = {
                "href": request.url.path,
                "method": "POST",
            }

        return dictionary




@app.post("/api/academia/materials/{course}", status_code=201)
async def add_course_materials(course: str, request: Request, authorization: Annotated[str, Header()],):

    role, uid = ValidateIdentity(authorization)

    url = f"http://study_web_service:8000/api/academia/lectures/authorization/{course.strip()}?method=POST"
    headers = {"Authorization": authorization}
    response = requests.get(url, headers=headers)

    if response.status_code == 200:
        data = response.json()

        if data["status"] != "owner":
            raise HTTPException(status_code=403, detail="You aren't authorized to access this resource")

    body = await request.json()

    evaluation = body.get("probe-evaluare", {})

    # Validate Grade Percentages
    percentage = 0
    for evaluationType in evaluation:
        if evaluation[evaluationType] < 0 or evaluation[evaluationType] > 1:
            raise HTTPException(status_code=422, detail="Invalid Percentage")
        percentage += evaluation[evaluationType]

    if percentage != 1:
        raise HTTPException(status_code=422, detail="Invalid Percentages")

    # Validate Course Materials
    course_materials = body.get("materiale-curs", [])
    for course_material in course_materials:
        # Validate name and path ?
        if course_material["nume-fisier"] == "":
            raise HTTPException(status_code=422, detail="Name cannot be empty!")

        if "content" not in course_material or not course_material["content"]:
            raise HTTPException(status_code=422, detail="File content cannot be empty")

        try:
            file_content = base64.b64decode(course_material["content"])
        except Exception:
            raise HTTPException(status_code=422, detail="Invalid file content encoding")

        if not course_material["nume-fisier"].lower().endswith(".pdf"):
            raise HTTPException(status_code=415, detail="Only .pdf files are allowed")

        if len(file_content) > 5 * 1024 * 1024:
            raise HTTPException(status_code=422, detail="File size exceeds limit")

        if len(course_material["nume-fisier"]) > 256:
            raise HTTPException(status_code=422, detail="Name too long")

    # Validate Laboratory Materials

    lab_materials = body.get("materiale-laborator", [])
    for lab_material in lab_materials:
        # Validate name and path ?
        if lab_material["nume-fisier"] == "" :
            raise HTTPException(status_code=422, detail="File name cannot be empty")

        if "content" not in lab_material or not lab_material["content"]:
            raise HTTPException(status_code=422, detail="File content cannot be empty")

        try:
            file_content = base64.b64decode(lab_material["content"])
        except Exception:
            raise HTTPException(status_code=422, detail="Invalid file content encoding")

        if len(file_content) > 5 * 1024 * 1024:
            raise HTTPException(status_code=422, detail="File size exceeds limit")

        if not lab_material["nume-fisier"].lower().endswith(".pdf"):
            raise HTTPException(status_code=415, detail="Only .pdf files are allowed")

        if len(lab_material["nume-fisier"]) > 256:
            raise HTTPException(status_code=422, detail="Name too long")

    document_exists = pos_collection.find_one({"disciplina": course.strip()})
    if document_exists:
        raise HTTPException(status_code=409, detail="Course materials already exist")

    document = {
        "disciplina": course,
        "probe-evaluare": evaluation,
        "materiale-curs": course_materials,
        "materiale-laborator": lab_materials
    }
    resource = document.copy()

    res = pos_collection.insert_one(document)

    resource["_id"] = str(res.inserted_id)

    return resource

@app.put("/api/academia/materials/{course}", status_code=204, responses=(
        {
            **default_responses,
            404: {"description": "Not Found"},
        }
    )
)
async def update_course_materials(course: str, request: Request, authorization: Annotated[str, Header()],):

    role, uid = ValidateIdentity(authorization)

    url = f"http://study_web_service:8000/api/academia/lectures/authorization/{course.strip()}?method=GET"
    headers = {"Authorization": authorization}
    response = requests.get(url, headers=headers)

    if response.status_code == 200:
        data = response.json()

        if data["status"] != "owner":
            raise HTTPException(status_code=403, detail="You aren't authorized to access this resource")

    if not pos_collection.find_one({"disciplina": course.strip()}):
        raise HTTPException(status_code=404, detail="Course not found")

    body = await request.json()

    evaluation = body.get("probe-evaluare", {})

    # Validate Grade Percentages
    percentage = 0
    for evaluationType in evaluation:
        if evaluation[evaluationType] < 0 or evaluation[evaluationType] > 1:
            raise HTTPException(status_code=422, detail="Invalid Percentage")
        percentage += evaluation[evaluationType]

    if percentage != 1:
        raise HTTPException(status_code=422, detail="Invalid Percentages")

    # Validate Course Materials
    course_materials = body.get("materiale-curs", [])
    for course_material in course_materials:
        # Validate name and path ?
        if course_material["nume-fisier"] == "":
            raise HTTPException(status_code=422, detail="Name cannot be empty")

        if "content" not in course_material or not course_material["content"]:
            raise HTTPException(status_code=422, detail="File content cannot be empty")

        try:
            file_content = base64.b64decode(course_material["content"])
        except Exception:
            raise HTTPException(status_code=422, detail="Invalid file content encoding")

        if not course_material["nume-fisier"].lower().endswith(".pdf"):
            raise HTTPException(status_code=415, detail="Only .pdf files are allowed")

        if len(file_content) > 5 * 1024 * 1024:
            raise HTTPException(status_code=422, detail="File size exceeds limit")

        if len(course_material["nume-fisier"]) > 256:
            raise HTTPException(status_code=422, detail="Name too long")

    # Validate Laboratory Materials
    lab_materials = body.get("materiale-laborator", [])
    for lab_material in lab_materials:
        # Validate name and path ?
        if lab_material["nume-fisier"] == "":
            raise HTTPException(status_code=422, detail="Name cannot be empty")

        if "content" not in lab_material or not lab_material["content"]:
            raise HTTPException(status_code=422, detail="File content cannot be empty")

        try:
            file_content = base64.b64decode(lab_material["content"])
        except Exception:
            raise HTTPException(status_code=422, detail="Invalid file content encoding")

        if len(file_content) > 5 * 1024 * 1024:
            raise HTTPException(status_code=422, detail="File size exceeds limit")

        if not lab_material["nume-fisier"].lower().endswith(".pdf"):
            raise HTTPException(status_code=415, detail="Only .pdf files are allowed")

        if len(lab_material["nume-fisier"]) > 256:
            raise HTTPException(status_code=422, detail="Name too long")

    pos_collection.update_one(
        {"disciplina": course.strip()},
        {
            "$set": {
                "probe-evaluare": evaluation,
                "materiale-curs": course_materials,
                "materiale-laborator": lab_materials,
            }
        }
    )

    return {}
