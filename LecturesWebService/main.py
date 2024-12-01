import json
from math import ceil

from fastapi import FastAPI
from fastapi import Request, HTTPException
from bson.json_util import dumps
import pymongo


app = FastAPI()


mongodb_uri = "mongodb://pos:posadmin@localhost:27017/pos?authSource=admin"
client = pymongo.MongoClient(mongodb_uri)
db = client["pos"]
pos_collection = db["pos"]


@app.get("/")
async def root():
    return {"message": "Hello World"}


@app.get("/api/academia/materials")
async def root(
        page: int = 1,
        items_per_page: int = 10
):

    start_index = (page - 1) * items_per_page
    total_items = pos_collection.count_documents({})

    if start_index >= total_items:
        raise HTTPException(status_code=416, detail={"max_page": ceil(total_items / items_per_page),
                                                      "items_per_page": items_per_page})

    collection = pos_collection.find({}).skip(start_index).limit(items_per_page)
    materials = json.loads(dumps(collection))
    return {"materials": materials}


@app.get("/api/academia/materials/{course}")
async def root(course: str):
    collection = pos_collection.find_one({"disciplina": course})
    materials = json.loads(dumps(collection))
    return materials

@app.post("/api/academia/materials/{course}", status_code=204)
async def root(course: str, request: Request):
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

@app.put("/api/academia/materials/{course}", status_code=204)
async def root(course: str, request: Request):

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
