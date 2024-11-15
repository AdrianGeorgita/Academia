import json

from fastapi import FastAPI
from fastapi import Request, HTTPException
from bson.json_util import dumps
import pymongo


app = FastAPI()


mongodb_uri = "mongodb://pos:posadmin@localhost:27017/pos?authSource=admin"
client = pymongo.MongoClient(mongodb_uri)
db = client["pos"]
pos_collection = db["pos"]

test_data = {
    "name": "TestName",
    "age": 35,
    "test": [
        {
            "name": "TestName2",
            "property": "value"
        }
    ]
}

probe_evaluare_materiale = {
    "disciplina": "Programarea Dispozitivelor Mobile",
    "probe-evaluare": {
        "activitate-laborator": 0.2,
        "examinare-finala": 0.5,
        "proiect": 0.3
    },
    "materiale-curs": [
        {
            "nume-fisier": "Curs2",
            "path": "..//Curs2.pdf",
        },
        {
            "nume-fisier": "Curs7",
            "path": "..//Curs7.pdf",
        }
    ],
    "materiale-laborator": [
        {
            "nume-fisier": "Laborator1",
            "path": "..//Laborator1.pdf",
        },
        {
            "nume-fisier": "Laborator8",
            "path": "..//Laborator8.pdf",
        }
    ]
}

#pos_collection.insert_one(test_data)

#pos_collection.insert_one(probe_evaluare_materiale)

#print(pos_collection.find_one({"name": "TestName"}))

#client.close()


@app.get("/")
async def root():
    return {"message": "Hello World"}


@app.get("/materials")
async def root():
    collection = pos_collection.find({})
    materials = json.loads(dumps(collection))
    return {"materials": materials}


@app.get("/materials/{course}")
async def root(course: str):
    collection = pos_collection.find_one({"disciplina": course})
    materials = json.loads(dumps(collection))
    return {"materials": materials}

@app.put("/materials/{course}")
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


@app.get("/hello/{name}")
async def say_hello(name: str):
    return {"message": f"Hello {name}"}
