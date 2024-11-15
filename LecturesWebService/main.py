import json

from fastapi import FastAPI
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
    materials = []
    collection = pos_collection.find({})
    for doc in collection:
        materials.append(doc)

    print(materials)

@app.get("/hello/{name}")
async def say_hello(name: str):
    return {"message": f"Hello {name}"}
