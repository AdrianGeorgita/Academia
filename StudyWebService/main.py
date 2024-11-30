from typing import Union
from peewee import MySQLDatabase
from peewee import Model, CharField, IntegerField, ForeignKeyField, CompositeKey
from playhouse.shortcuts import model_to_dict

from fastapi import FastAPI, HTTPException, Request, Body, Response
from typing import Optional

import json

db = MySQLDatabase(database='pos', user='posadmin', passwd='passwdpos', host='localhost', port=3306)

app = FastAPI()

db.connect()

class BaseModel(Model):
    class Meta:
        database = db


class Teacher(BaseModel):
    id = IntegerField(primary_key=True)
    nume = CharField()
    prenume = CharField()
    email = CharField(unique=True)
    grad_didactic = CharField()
    tip_asociere = CharField()
    afiliere = CharField()

    class Meta:
        db_table = 'profesor'

class Student(BaseModel):
    id = IntegerField(primary_key=True)
    nume = CharField()
    prenume = CharField()
    email = CharField(unique=True)
    ciclu_studii = CharField()
    an_studiu = IntegerField()
    grupa = IntegerField()

    class Meta:
        db_table = 'student'

class Lecture(BaseModel):
    cod = CharField(primary_key=True)
    id_titular = IntegerField()
    nume_disciplina = CharField()
    an_studiu = IntegerField()
    tip_disciplina = CharField()
    categorie_disciplina = CharField()
    tip_examinare = CharField()

    class Meta:
        db_table = 'disciplina'

class Student_Disciplina(BaseModel):
    DisciplinaID = CharField(primary_key=True)
    StudentID = IntegerField()

    class Meta:
        db_table = 'join_ds'

@app.get("/")
def read_root():
    return {"Hello": "World"}


@app.get("/api/academia/teachers")
def read_teachers(
        request: Request, name: Union[str, None] = None,
        teachingDegree: Union[str, None] = None,
        associationType: Union[str, None] = None,
        affiliation: Union[str, None] = None,
        email: Union[str, None] = None,
        surname: Union[str, None] = None,
        page: int = 1,
        items_per_page: int = 10,
):
    if name:
        res = Teacher.select().where(Teacher.nume.contains(name)).order_by(Teacher.prenume)
    elif surname:
        res = Teacher.select().where(Teacher.prenume.contains(surname)).order_by(Teacher.prenume)
    elif email:
        res = Teacher.select().where(Teacher.email.contains(email)).order_by(Teacher.prenume)
    elif teachingDegree:
        res = Teacher.select().where(Teacher.grad_didactic.contains(teachingDegree)).order_by(Teacher.prenume)
    elif associationType:
        res = Teacher.select().where(Teacher.tip_asociere.contains(associationType)).order_by(Teacher.prenume)
    elif affiliation:
        res = Teacher.select().where(Teacher.afiliere.contains(affiliation)).order_by(Teacher.prenume)
    else:
        res = Teacher.select()

    total_teachers = res.count()
    start_index = (page - 1) * items_per_page
    end_index = start_index + items_per_page

    if start_index >= total_teachers:
        pass
        # pagina nu exista

    res = res.limit(items_per_page).offset(start_index)

    print(res)

    teachers = []
    for teacher in res:
        teacher_dict = model_to_dict(teacher)
        teacher_dict["_links"] = {
            "self": {
                "href": request.url.path,
            },
            "parent": {
                "href": '/'.join(request.url.path.split('/')[:-1])
            },
            "page": page,
            "items_per_page": items_per_page,
        }
        teachers.append(teacher_dict)

    return {"teachers": teachers}


@app.get("/api/academia/teachers/{teacher_id}")
def read_item(teacher_id: int, request: Request, q: Union[str, None] = None):
    try:
        teacher = Teacher.select().where(Teacher.id == teacher_id).get()
    except:
        raise HTTPException(status_code=404, detail="Teacher not found")

    return {
        "teacher": {
            **model_to_dict(teacher),
            "_links": {
                "self": {
                    "href": request.url.path,
                },
                "parent": {
                    "href": '/'.join(request.url.path.split('/')[:-1])
                },
                "lectures": {
                    "href": request.url.path + "/lectures"
                },
            }
        }
    }


@app.get("/api/academia/teachers/{teacher_id}/lectures")
def read_item(
        teacher_id: int,
        request: Request,
        page: int = 1,
        items_per_page: int = 10,
):
    try:
        teacher = Teacher.select().where(Teacher.id == teacher_id).get()
    except:
        raise HTTPException(status_code=404, detail="Teacher not found")

    teacher_lectures_res = Lecture.select().where(Lecture.id_titular == teacher.id)

    total_items = teacher_lectures_res.count()
    start_index = (page - 1) * items_per_page
    end_index = start_index + items_per_page

    if start_index >= total_items:
        pass
        # pagina nu exista

    teacher_lectures_res = teacher_lectures_res.limit(items_per_page).offset(start_index)

    teacher_lectures = []
    for lecture in teacher_lectures_res:
        lecture_dict = model_to_dict(lecture)
        teacher_lectures.append(lecture_dict)

    return {
        "teacher-lectures": {
            "lectures": teacher_lectures,
            "_links": {
                "self": {
                    "href": request.url.path,
                },
                "parent": {
                    "href": '/'.join(request.url.path.split('/')[:-1])
                }
            }
        }
    }


@app.post("/api/academia/teachers/add")
def add_teacher(
        firstName: str = Body(...),
        lastName: str = Body(...),
        email: str = Body(...),
        teachingDegree: str = Body(...),
        associationType: str = Body(...),
        affiliation: str = Body(...)
):
    try:
        res = Teacher.insert({
            "nume": firstName,
            "prenume": lastName,
            "email": email,
            "grad_didactic": teachingDegree,
            "tip_asociere": associationType,
            "afiliere": affiliation
        }).execute()
        return {"status": "success", "data": {"teacher_id": res}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error inserting teacher: {e}")


@app.put("/api/academia/teachers/{teacher_id}", status_code=204)
def update_teacher(
        teacher_id: int,
        response: Response,
        firstName: str = Body(...),
        lastName: str = Body(...),
        email: str = Body(...),
        teachingDegree: str = Body(...),
        associationType: str = Body(...),
        affiliation: str = Body(...)
):

    if not Teacher.get_or_none(Teacher.id == teacher_id):
        response.status_code = 201
        res = Teacher.insert({
            "nume": firstName,
            "prenume": lastName,
            "email": email,
            "grad_didactic": teachingDegree,
            "tip_asociere": associationType,
            "afiliere": affiliation
        }).execute()
        return {"status": "success", "data": {"teacher_id": res}}
    else:
        response.status_code = 204
        res = Teacher.update({
            "nume": firstName,
            "prenume": lastName,
            "email": email,
            "grad_didactic": teachingDegree,
            "tip_asociere": associationType,
            "afiliere": affiliation
        }).where(Teacher.id == teacher_id).execute()

        if res != 1:
            raise HTTPException(status_code=500, detail=f"Failed to update the teacher: {teacher_id}")

        return {
            "status": "success",
        }


@app.delete("/api/academia/teachers/{teacher_id}")
def delete_teacher(
        teacher_id: int,
):
    res = Teacher.select().where(Teacher.id == teacher_id)

    if res.count() < 1:
        raise HTTPException(status_code=404, detail=f"Professor with the id: {teacher_id} not found")

    copy = res.first()

    delete_res = Teacher.delete().where(Teacher.id == teacher_id).execute()

    if delete_res != 1:
        raise HTTPException(status_code=500, detail=f"Failed to delete the professor: {teacher_id}")

    return {
        "status": "success",
        "teacher": {**model_to_dict(copy)}
    }

@app.get("/api/academia/students")
def read_students(
        request: Request,
        name: Union[str, None] = None,
        surname: Union[str, None] = None,
        degree: Union[str, None] = None,
        year: Union[str, None] = None,
        email: Union[str, None] = None,
        group: Union[str, None] = None,
        page: int = 1,
        items_per_page: int = 10,
):
    if name:
        res = Student.select().where(Student.prenume.contains(name)).order_by(Student.nume)
    elif surname:
        res = Student.select().where(Student.nume.contains(surname)).order_by(Student.prenume)
    elif email:
        res = Student.select().where(Student.email.contains(email)).order_by(Student.prenume)
    elif degree:
        res = Student.select().where(Student.ciclu_studii.contains(degree)).order_by(Student.prenume)
    elif year:
        res = Student.select().where(Student.an_studiu.contains(year)).order_by(Student.prenume)
    elif group:
        res = Student.select().where(Student.grupa.contains(group)).order_by(Student.prenume)
    else:
        res = Student.select()

    if not res:
        raise HTTPException(status_code=404, detail="Students not found")

    total_items = res.count()
    start_index = (page - 1) * items_per_page
    end_index = start_index + items_per_page

    if start_index >= total_items:
        pass
        # pagina nu exista

    res = res.limit(items_per_page).offset(start_index)

    students = []
    for student in res:
        student_dict = model_to_dict(student)
        student_dict["_links"] = {
            "self": {
                "href": request.url.path,
            },
            "parent": {
                "href": '/'.join(request.url.path.split('/')[:-1])
            }
        }
        students.append(student_dict)

    return {"students": students}


@app.get("/api/academia/students/{student_id}")
def read_item(student_id: int, request: Request):
    try:
        student = Student.select().where(Student.id == student_id).get()
    except:
        raise HTTPException(status_code=404, detail="Student not found")

    return {
        "student": {
            **model_to_dict(student),
            "_links": {
                "self": {
                    "href": request.url.path,
                },
                "parent": {
                    "href": '/'.join(request.url.path.split('/')[:-1])
                },
                "lectures": {
                    "href": request.url.path + "/lectures"
                }
            }
        }
    }


@app.get("/api/academia/students/{student_id}/lectures")
def read_item(
        student_id: int,
        request: Request,
        page: int = 1,
        items_per_page: int = 10,
):
    try:
        student = Student.select().where(Student.id == student_id).get()
    except:
        raise HTTPException(status_code=404, detail="Student not found")

    student_lectures_res = Student_Disciplina.select().where(Student_Disciplina.StudentID == student.id)

    total_items = student_lectures_res.count()
    start_index = (page - 1) * items_per_page
    end_index = start_index + items_per_page

    if start_index >= total_items:
        pass
        # pagina nu exista

    student_lectures_res = student_lectures_res.limit(items_per_page).offset(start_index)

    student_lectures = []
    for student_lecture in student_lectures_res:
        lecture = Lecture.select().where(Lecture.cod == student_lecture).get()
        lecture_dict = model_to_dict(lecture)
        student_lectures.append(lecture_dict)

    return {
        "student-lectures": {
            "lectures": student_lectures,
            "_links": {
                "self": {
                    "href": request.url.path,
                },
                "parent": {
                    "href": '/'.join(request.url.path.split('/')[:-1])
                }
            }
        }
    }

@app.post("/api/academia/students/add")
def add_student(
        first_name: str = Body(...),
        last_name: str = Body(...),
        email: str = Body(...),
        study_cycle: str = Body(...),
        study_year: int = Body(...),
        group: int = Body(...)
):
    try:
        res = Student.insert({
            "nume": last_name,
            "prenume": first_name,
            "email": email,
            "ciclu_studii": study_cycle,
            "an_studiu": study_year,
            "grupa": group
        }).execute()
        return {"status": "success", "data": {"student_id": res}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error inserting student: {e}")


@app.put("/api/academia/students/{student_id}", status_code=204)
def update_student(
        student_id: int,
        response: Response,
        first_name: str = Body(...),
        last_name: str = Body(...),
        email: str = Body(...),
        study_cycle: str = Body(...),
        study_year: int = Body(...),
        group: int = Body(...)
):

    if not Student.get(Student.id == student_id):
        response.status_code = 201
        res = Student.insert({
            "nume": last_name,
            "prenume": first_name,
            "email": email,
            "ciclu_studii": study_cycle,
            "an_studiu": study_year,
            "grupa": group
        }).execute()
        return {"status": "success", "data": {"student_id": res}}
    else:
        response.status_code = 204
        res = Student.update({
            "nume": last_name,
            "prenume": first_name,
            "email": email,
            "ciclu_studii": study_cycle,
            "an_studiu": study_year,
            "grupa": group
        }).where(Student.id == student_id).execute()

        if res != 1:
            raise HTTPException(status_code=500, detail=f"Failed to update the student: {student_id}")

        return {
            "status": "success",
        }



@app.delete("/api/academia/students/{student_id}")
def delete_student(
        student_id: int,
):
    res = Student.select().where(Student.id == student_id)

    if res.count() < 1:
        raise HTTPException(status_code=404, detail=f"Student with the id: {student_id} not found")

    copy = res.first()

    delete_res = Student.delete().where(Student.id == student_id).execute()

    if delete_res != 1:
        raise HTTPException(status_code=500, detail=f"Failed to delete the student: {student_id}")

    return {
        "status": "success",
        "student": {**model_to_dict(copy)}
    }


@app.get("/api/academia/lectures")
def read_lectures(
        request: Request,
        coordinator: Union[str, None] = None,
        name: Union[str, None] = None,
        year: Union[str, None] = None,
        type: Union[str, None] = None,
        category: Union[str, None] = None,
        examination: Union[str, None] = None,
        page: int = 1,
        items_per_page: int = 10,
):
    if coordinator:
        res = Lecture.select().where(Lecture.id_titular == (Teacher.select().where(Teacher.nume.contains(coordinator)).get())).order_by(Lecture.cod)
    elif name:
        res = Lecture.select().where(Lecture.nume_disciplina.contains(name)).order_by(Lecture.cod)
    elif year:
        res = Lecture.select().where(Lecture.an_studiu == year).order_by(Lecture.cod)
    elif type:
        res = Lecture.select().where(Lecture.tip_disciplina.contains(type)).order_by(Lecture.cod)
    elif category:
        res = Lecture.select().where(Lecture.categorie_disciplina.contains(category)).order_by(Lecture.cod)
    elif examination:
        res = Lecture.select().where(Lecture.tip_examinare.contains(examination)).order_by(Lecture.cod)
    else:
        res = Lecture.select()

    if not res:
        raise HTTPException(status_code=404, detail="lecture not found")

    total_items = res.count()
    start_index = (page - 1) * items_per_page
    end_index = start_index + items_per_page

    if start_index >= total_items:
        pass
        # pagina nu exista

    res = res.limit(items_per_page).offset(start_index)

    lectures = []
    for lecture in res:
        lecture_dict = model_to_dict(lecture)
        lecture_dict["_links"] = {
            "self": {
                "href": request.url.path,
            },
            "parent": {
                "href": '/'.join(request.url.path.split('/')[:-1])
            }
        }
        lectures.append(lecture_dict)

    return {"lectures": lectures}


@app.post("/api/academia/lectures/add")
def add_lecture(
        code: str = Body(...),
        coordinator_id: int = Body(...),
        lecture_name: str = Body(...),
        year: int = Body(...),
        lecture_type: str = Body(...),
        category: str = Body(...),
        examination: str = Body(...)
):
    try:
        res = Lecture.insert({
            "cod": code,
            "id_titular": coordinator_id,
            "nume_disciplina": lecture_name,
            "an_studiu": year,
            "tip_disciplina": lecture_type,
            "categorie_disciplina": category,
            "tip_examinare": examination
        }).execute()
        return {"status": "success", "data": {"lecture_id": res}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error inserting lecture: {e}")


@app.put("/api/academia/lectures/{lecture_code}", status_code=204)
def update_lecture(
        lecture_code: str,
        response: Response,
        coordinator_id: int = Body(...),
        lecture_name: str = Body(...),
        year: int = Body(...),
        lecture_type: str = Body(...),
        category: str = Body(...),
        examination: str = Body(...)
):

    if not Lecture.get_or_none(Lecture.cod == lecture_code):
        response.status_code = 201
        res = Lecture.insert({
            "cod": lecture_code,
            "id_titular": coordinator_id,
            "nume_disciplina": lecture_name,
            "an_studiu": year,
            "tip_disciplina": lecture_type,
            "categorie_disciplina": category,
            "tip_examinare": examination
        }).execute()
        return {"status": "success", "data": {"lecture_id": res}}
    else:
        response.status_code = 204
        res = Lecture.update({
            "id_titular": coordinator_id,
            "nume_disciplina": lecture_name,
            "an_studiu": year,
            "tip_disciplina": lecture_type,
            "categorie_disciplina": category,
            "tip_examinare": examination
        }).where(Lecture.cod == lecture_code).execute()

        if res != 1:
            raise HTTPException(status_code=500, detail=f"Failed to update the lecture: {lecture_code}")

        return {
            "status": "success",
        }


@app.delete("/api/academia/lectures/{lecture_code}")
def delete_lecture(
        lecture_code: str,
):
    res = Lecture.select().where(Lecture.cod == lecture_code)

    if res.count() < 1:
        raise HTTPException(status_code=404, detail=f"Lecture with the code: {lecture_code} not found")

    copy = res.first()

    delete_res = Lecture.delete().where(Lecture.cod == lecture_code).execute()

    if delete_res != 1:
        raise HTTPException(status_code=500, detail=f"Failed to delete the lecture: {lecture_code}")

    return {
        "status": "success",
        "lecture": {**model_to_dict(copy)}
    }

