import json
from math import ceil

from typing import Annotated

from fastapi import FastAPI
from fastapi import Request, HTTPException, Header
from bson.json_util import dumps
import pymongo

import grpc, auth_pb2, auth_pb2_grpc

app = FastAPI()


mongodb_uri = "mongodb://pos:posadmin@localhost:27017/pos?authSource=admin"
client = pymongo.MongoClient(mongodb_uri)
db = client["pos"]
pos_collection = db["pos"]

def ValidateIdentity(token: str):
    if not token.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization header invalid or not present")
    else:
        jws = token.split("Bearer ")[1]

        with grpc.insecure_channel("localhost:50051") as channel:
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
        authorization: Annotated[str, Header()],
        page: int = 1,
        items_per_page: int = 10
):

    role, uid = ValidateIdentity(authorization)

    start_index = (page - 1) * items_per_page
    total_items = pos_collection.count_documents({})

    if start_index >= total_items:
        raise HTTPException(status_code=416, detail={"max_page": ceil(total_items / items_per_page),
                                                      "items_per_page": items_per_page})

    collection = pos_collection.find({}).skip(start_index).limit(items_per_page)
    materials = json.loads(dumps(collection))
    return {"materials": materials}


@app.get("/api/academia/materials/{course}")
async def get_course_materials(course: str, request: Request, authorization: Annotated[str, Header()],):

    role, uid = ValidateIdentity(authorization)

    collection = pos_collection.find_one({"disciplina": course})
    materials = json.loads(dumps(collection))
    return materials

@app.post("/api/academia/materials/{course}", status_code=204)
async def add_course_materials(course: str, request: Request, authorization: Annotated[str, Header()],):

    role, uid = ValidateIdentity(authorization)

    body = await request.json()

    evaluation = body["probe-evaluare"]

    # Validate Grade Percentages
    percentage = 0
    for evaluationType in evaluation:
        if evaluation[evaluationType] < 0 or evaluation[evaluationType] > 1:
            raise HTTPException(status_code=422, detail="Invalid Percentage")
        percentage += evaluation[evaluationType]

    if percentage != 1:
        raise HTTPException(status_code=422, detail="Invalid Percentages")

    # Validate Course Materials
    course_materials = body["materiale-curs"]
    paths = []
    for course_material in course_materials:
        # Validate name and path ?
        if course_material["nume-fisier"] == "" or course_material["path"] == "":
            raise HTTPException(status_code=422, detail="Invalid Path or Name")
        if course_material["path"] in paths:
            raise HTTPException(status_code=422, detail="Duplicate Path")
        if len(course_material["path"]) > 2048:
            raise HTTPException(status_code=422, detail="Path too long")
        if len(course_material["nume-fisier"]) > 256:
            raise HTTPException(status_code=422, detail="Name too long")
        paths.append(course_material["path"])

    # Validate Laboratory Materials
    lab_materials = body["materiale-laborator"]
    paths = []
    for lab_material in lab_materials:
        # Validate name and path ?
        if lab_material["nume-fisier"] == "" or lab_material["path"] == "":
            raise HTTPException(status_code=422, detail="Invalid Path or Name")
        if lab_material["path"] in paths:
            raise HTTPException(status_code=422, detail="Duplicate Path")
        if len(lab_material["path"]) > 2048:
            raise HTTPException(status_code=422, detail="Path too long")
        if len(lab_material["nume-fisier"]) > 256:
            raise HTTPException(status_code=422, detail="Name too long")
        paths.append(lab_material["path"])

    document = {
        "disciplina": course,
        "probe-evaluare": evaluation,
        "materiale-curs": course_materials,
        "materiale-laborator": lab_materials
    }

    pos_collection.insert_one(document)

    return {"message": "Materials document added"}

@app.put("/api/academia/materials/{course}", status_code=204, responses=(
        {
            **default_responses,
            404: {"description": "Not Found"},
        }
    )
)
async def update_course_materials(course: str, request: Request, authorization: Annotated[str, Header()],):

    role, uid = ValidateIdentity(authorization)

    if not pos_collection.find_one({"disciplina": course}):
        raise HTTPException(status_code=404, detail="Course not found")

    body = await request.json()

    evaluation = body["probe-evaluare"]

    # Validate Grade Percentages
    percentage = 0
    for evaluationType in evaluation:
        if evaluation[evaluationType] < 0 or evaluation[evaluationType] > 1:
            raise HTTPException(status_code=422, detail="Invalid Percentage")
        percentage += evaluation[evaluationType]

    if percentage != 1:
        raise HTTPException(status_code=422, detail="Invalid Percentages")

    # Validate Course Materials
    course_materials = body["materiale-curs"]
    paths = []
    for course_material in course_materials:
        # Validate name and path ?
        if course_material["nume-fisier"] == "" or course_material["path"] == "":
            raise HTTPException(status_code=422, detail="Invalid Path or Name")
        if course_material["path"] in paths:
            raise HTTPException(status_code=422, detail="Duplicate Path")
        if len(course_material["path"]) > 2048:
            raise HTTPException(status_code=422, detail="Path too long")
        if len(course_material["nume-fisier"]) > 256:
            raise HTTPException(status_code=422, detail="Name too long")
        paths.append(course_material["path"])

    # Validate Laboratory Materials
    lab_materials = body["materiale-laborator"]
    paths = []
    for lab_material in lab_materials:
        # Validate name and path ?
        if lab_material["nume-fisier"] == "" or lab_material["path"] == "":
            raise HTTPException(status_code=422, detail="Invalid Path or Name")
        if lab_material["path"] in paths:
            raise HTTPException(status_code=422, detail="Duplicate Path")
        if len(lab_material["path"]) > 2048:
            raise HTTPException(status_code=422, detail="Path too long")
        if len(lab_material["nume-fisier"]) > 256:
            raise HTTPException(status_code=422, detail="Name too long")
        paths.append(lab_material["path"])

    pos_collection.update_one(
        {"disciplina": course},
        {
            "$set": {
                "probe-evaluare": evaluation,
                "materiale-curs": course_materials,
                "materiale-laborator": lab_materials,
            }
        }
    )

    return {"message": "Course Updated"}
