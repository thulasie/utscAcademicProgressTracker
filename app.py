from flask import Flask, render_template, request, jsonify, redirect, url_for, session
import sqlite3

app = Flask(__name__)
app.secret_key = "utsc_grade_tracker_secret"


def get_db():
    conn = sqlite3.connect("grades.db")
    conn.row_factory = sqlite3.Row
    return conn

def create_tables():
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
                    CREATE TABLE IF NOT EXISTS students (
                        id   INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL,
                        student_num INTEGER NOT NULL UNIQUE
                    )
                """)

    cursor.execute("""
                    CREATE TABLE IF NOT EXISTS courses (
                        id         INTEGER PRIMARY KEY AUTOINCREMENT,
                        student_id INTEGER NOT NULL,
                        name       TEXT NOT NULL,
                        FOREIGN KEY (student_id) REFERENCES students(id)
                    )
                """)

    cursor.execute("""
                    CREATE TABLE IF NOT EXISTS assessments (
                        id        INTEGER PRIMARY KEY AUTOINCREMENT,
                        course_id INTEGER NOT NULL,
                        name      TEXT NOT NULL,
                        type      TEXT NOT NULL,
                        weight    REAL NOT NULL,
                        grade     REAL,
                        FOREIGN KEY (course_id) REFERENCES courses(id)
                    )
                """)


    cursor.execute("""
                    CREATE TABLE IF NOT EXISTS course_ratings (
                        id         INTEGER PRIMARY KEY AUTOINCREMENT,
                        student_id INTEGER NOT NULL,
                        course_name TEXT NOT NULL,
                        rating     INTEGER NOT NULL,
                        UNIQUE(student_id, course_name)
                    )
                """)

    conn.commit()
    conn.close()




def percent_to_gpa(percent):        # helper function to convert % to GPA point
    if (percent >= 85):   
        return 4.0
    elif (percent >= 80): 
        return 3.7
    elif (percent >= 77): 
        return 3.3
    elif (percent >= 73): 
        return 3.0
    elif (percent >= 70): 
        return 2.7
    elif (percent >= 67): 
        return 2.3
    elif (percent >= 63): 
        return 2.0
    elif (percent >= 60): 
        return 1.7
    elif (percent >= 57): 
        return 1.3
    elif (percent >= 53): 
        return 1.0
    elif (percent >= 50): 
        return 0.7
    else:              
        return 0.0
    

def gpa_to_letter(gpa):     # helper function to convert gpa point to letter grade
    if (gpa >= 4.0):   
        return "A+"
    elif (gpa >= 3.7): 
        return "A"
    elif (gpa >= 3.3): 
        return "A-"
    elif (gpa >= 3.0): 
        return "B+"
    elif (gpa >= 2.7): 
        return "B"
    elif (gpa >= 2.3): 
        return "B-"
    elif (gpa >= 2.0): 
        return "C+"
    elif (gpa >= 1.7): 
        return "C"
    elif (gpa >= 1.3): 
        return "C-"
    elif (gpa >= 1.0): 
        return "D+"
    elif (gpa >= 0.7): 
        return "D"
    else:   
        return "F"


GPA_TO_MIN_PERCENT = {
    4.0: 85, 3.7: 80, 3.3: 77, 3.0: 73,
    2.7: 70, 2.3: 67, 2.0: 63, 1.7: 60,
    1.3: 57, 1.0: 53, 0.7: 50, 0.0: 0
}

def calc_current_percent(assessments):
    graded_weight = 0                       #total weight for all assessmrnts in a course
    earned_points = 0                       # total weighted points for an assessment in a course

    for a in assessments:
        if a["grade"] is not None:
            graded_weight += a["weight"]                        # adding an assessmrnt's weight to the total weight
            earned_points += a["weight"] * a["grade"] / 100     # calculates points based on assessment grade and wright
    
    if graded_weight == 0:                                      # if no assignments have been graded yet the graded_weight wpuld still be 0, return None
        return None
    
    return round(earned_points / graded_weight * 100, 2)



@app.route("/")
def index():
    if "student_id" in session:                 # if user is already logged in go to /courses, if not go to login       
        return redirect(url_for("courses"))
    
    return render_template("login.html")



@app.route("/login", methods=["POST"])
def login():
    name = request.form["name"].strip()
    studentNum = request.form["studentNum"].strip()

    if not name:                                                                # error messages if fields in logn left blank
        return render_template("login.html", error="Please enter your name.")
    
    if not studentNum:
        return render_template("login.html", error="Please enter your student number.")

    conn = get_db()
    cursor = conn.cursor()


    cursor.execute("SELECT * FROM students WHERE student_num = ?", (studentNum,))       # student already exits
    alreadyExists = cursor.fetchone()

    if (alreadyExists is not None) and (alreadyExists["name"] != name):  # error student exists but name doesnt match
        conn.close()
        return render_template("login.html", error="This student number is registered to a student with another name.")
        

    if alreadyExists is None:  # adding if dpesnt exist
        cursor.execute("INSERT INTO STUDENTS (name, student_num) VALUES (?, ?)", (name, studentNum))
        conn.commit()
        cursor.execute("SELECT * FROM students WHERE student_num = ?", (studentNum,))
        alreadyExists = cursor.fetchone()       # put new student info in alreadyExists to then save in the session

    conn.close()

    session["student_id"] = alreadyExists["id"]
    session["student_num"] = alreadyExists["student_num"]
    session["student_name"] = alreadyExists["name"]

    return redirect(url_for("courses"))





@app.route("/logout")           # clearing session and going to / when logging out
def logout():
    session.clear()
    return redirect(url_for("index"))



@app.route("/courses")
def courses():
    if "student_id" not in session:                 #cannot access /courses if not logged in
        return redirect(url_for("index"))
    return render_template("courses.html")



@app.route("/add_course", methods=["POST"])
def add_course():
    if "student_id" not in session:             # cannot add courses if not logged in
        return "Not logged in", 403
    
    name = request.form["name"].strip()
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO courses (student_id, name) VALUES (?, ?)", (session["student_id"], name))   # inserting into courses when coure added
    conn.commit()
    conn.close()
    return "ok"



@app.route("/delete_course", methods=["POST"])
def delete_course():
    course_id = request.form["course_id"]
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM assessments WHERE course_id = ?", (course_id,))     # deleting the assessments with the course id that is being deleted
    cursor.execute("DELETE FROM courses WHERE id = ?", (course_id,))                # deleting the course
    conn.commit()   
    conn.close()
    return "ok"



@app.route("/get_courses")
def get_courses():
    if "student_id" not in session:
        return jsonify([])                  # empty json array if not logged in
    

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM courses WHERE student_id = ?", (session["student_id"],))  # gets all courses
    courses = cursor.fetchall()

    result = []
    for course in courses:
        cursor.execute("SELECT * FROM assessments WHERE course_id = ?", (course["id"],))    #for each course id, gets assessemrnts
        assessments = cursor.fetchall()

        current_percent = calc_current_percent(assessments)     #calculate the course's current % using the helper

        if current_percent is not None:
            current_gpa = percent_to_gpa(current_percent)       # convert to gpa using helper
        else:
            current_gpa = None

    
        if current_gpa is not None:
            current_letter = gpa_to_letter(current_gpa)         # convert gpa to letter using helper
        else:
            current_letter = "N/A"


        total_weight = 0                            # loops through all assessments and add weights
        for a in assessments:
            total_weight += a["weight"]

        ungraded_weight = 0                         #adds ungraded weight if there s no grade
        for a in assessments:
            if a["grade"] is None:
                ungraded_weight += a["weight"]

        if total_weight == 100 and ungraded_weight == 0:            # marks if course is complete or not based on weight
            is_complete = True
        else:
            is_complete = False


                                        # gets the grade and weight of others in the same course (excludes current student ID)              
        cursor.execute("""                                  
                            SELECT a.weight, a.grade
                            FROM assessments a
                            JOIN courses c ON a.course_id = c.id
                            WHERE c.name = ? AND c.student_id != ?
                        """, 
        (course["name"], session["student_id"]))
        other_assessments = cursor.fetchall()


        if other_assessments:
            class_avg = calc_current_percent(other_assessments)     #calculate avg of the course if there are other students' assessments
        else:
            class_avg = None

                                                    # gets the class rating excluding current student's rating
        cursor.execute("""
                            SELECT AVG(rating) as avg_rating, COUNT(*) as count
                            FROM course_ratings
                            WHERE course_name = ? AND student_id != ?
                        """, 
        (course["name"], session["student_id"]))
        rating_row = cursor.fetchone()


        if rating_row["avg_rating"] is not None:
            avg_rating = round(rating_row["avg_rating"], 1)         # rouding the rating
        else:
            avg_rating = None

        rating_count = rating_row["count"]

                                                                    # checks if the current student has already rated the course
        cursor.execute("""
                            SELECT rating FROM course_ratings
                            WHERE student_id = ? AND course_name = ?
                        """, 
        (session["student_id"], course["name"]))
        my_rating_row = cursor.fetchone()


        if my_rating_row:
            my_rating = my_rating_row["rating"]                     # saves rating if current user has rated
        else:
            my_rating = None


        assignment_grades = [                       # list of the grades for the graded assignments
            a["grade"]
            for a in assessments
            if a["type"] == "Assignment"
            and a["grade"] is not None
        ]

        test_grades = [                             # list of the grades for the graded tests
            a["grade"]
            for a in assessments
            if a["type"] == "Test"
            and a["grade"] is not None
        ]

        avg_assignment = (                          # calculating the average for the assignments
            round(sum(assignment_grades) / len(assignment_grades), 1)
            if assignment_grades
            else None
        )

        avg_test = (                                            # calculating the average for the tests
            round(sum(test_grades) / len(test_grades), 1)
            if test_grades
            else None
        )

        result.append({                             # populating the dictionary
            "id": course["id"],
            "name": course["name"],
            "current_percent": current_percent,
            "current_gpa": current_gpa,
            "current_letter": current_letter,
            "is_complete": is_complete,
            "class_avg": class_avg,
            "avg_rating": avg_rating,
            "rating_count": rating_count,
            "my_rating": my_rating,
            "avg_assignment": avg_assignment,
            "avg_test": avg_test,
            "assessments": [
                {"id": a["id"], "name": a["name"], "type": a["type"], "weight": a["weight"], "grade": a["grade"]}
                for a in assessments
            ]
        })

    conn.close()
    return jsonify(result)          # to make readable




@app.route("/add_assessment", methods=["POST"])
def add_assessment():
    course_id = request.form["course_id"]
    name = request.form["name"].strip()
    atype = request.form["type"]
    weight = float(request.form["weight"])
    grade_raw = request.form["grade"]

    if grade_raw != "":                     # convertng grade to a float or can be left blank
        grade = float(grade_raw)
    else:
        grade = None

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(                     # inserting values
        "INSERT INTO assessments (course_id, name, type, weight, grade) VALUES (?, ?, ?, ?, ?)",
        (course_id, name, atype, weight, grade)
    )
    conn.commit()
    conn.close()
    return "ok"




@app.route("/update_grade", methods=["POST"])
def update_grade():
    assessment_id = request.form["assessment_id"]
    grade_raw = request.form["grade"]

    if grade_raw != "":                     # grade can be updated or left blank
        grade = float(grade_raw)
    else:
        grade = None

    conn = get_db()
    cursor = conn.cursor()                  # updates the table
    cursor.execute("UPDATE assessments SET grade = ? WHERE id = ?", (grade, assessment_id))
    conn.commit()
    conn.close()
    return "ok"



@app.route("/delete_assessment", methods=["POST"])
def delete_assessment():
    assessment_id = request.form["assessment_id"]
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM assessments WHERE id = ?", (assessment_id,))        # deletes from table
    conn.commit()
    conn.close()
    return "ok"





@app.route("/rate_course", methods=["POST"])
def rate_course():
    course_name = request.form["course_name"]
    rating = int(request.form["rating"])            # converting string to int

    conn = get_db()
    cursor = conn.cursor()

                             # insert a new rating or can replace a rating (making a new row with student id, course name, and rating)
    cursor.execute("""
                        INSERT OR REPLACE INTO course_ratings (student_id, course_name, rating)
                        VALUES (?, ?, ?)
                    """, 
    (session["student_id"], course_name, rating))
    conn.commit()
    conn.close()
    return "ok"



@app.route("/what_do_i_need", methods=["POST"])
def what_do_i_need():
    course_id = request.form["course_id"]
    target_gpa = float(request.form["target_gpa"])          # converting selected answer to float
    target_percent = GPA_TO_MIN_PERCENT[target_gpa]         # uses dictioanry from above to see what min percent is needed for a gpa

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM assessments WHERE course_id = ?", (course_id,))       # getting all assessments
    assessments = cursor.fetchall()
    conn.close()

    graded_weight = sum(                #adding weights for all the graded assessments
        a["weight"]
        for a in assessments
        if a["grade"] is not None
    )

    ungraded_weight = sum(              # addng weights for all the ungraded assessments
        a["weight"]
        for a in assessments
        if a["grade"] is None
    )

    earned_points = sum(                    # gets the total weighted points
        a["weight"] * a["grade"] / 100
        for a in assessments
        if a["grade"] is not None
    )

    total_weight = graded_weight + ungraded_weight

    if ungraded_weight == 0:
        return jsonify({"message": "All assessments are already graded! Enter an ungraded assignment to calculate what grade is needed to achieve your target."})

    needed = (target_percent * total_weight / 100 - earned_points) * 100 / ungraded_weight  # calculation for the grade that s needed to achieve the target

    if needed > 100:                                                        # messages depedning on if the target can be achieved
        return jsonify({"message": "Your target GPA is unattainable."})
    elif needed <= 0:
        return jsonify({"message": "Regardless of your grade on unmarked assignments, your target GPA will be achieved!"})
    else:
        return jsonify({"message": f"You need approximately {round(needed, 1)}% on your remaining assessments to achieve your target grade."})




@app.route("/cgpa")
def cgpa():
    if "student_id" not in session:                     # redirecting to login if not logged in
        return redirect(url_for("index"))
    return render_template("cgpa.html")



@app.route("/get_cgpa")
def get_cgpa():
    if "student_id" not in session:                     # no cgpa shown if not logged in
        return jsonify({"cgpa": None})


    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM courses WHERE student_id = ?", (session["student_id"],))      # getting all of a student's courses
    courses = cursor.fetchall()

    total_credits = 0                       # credits accumulated so far
    weighted_total = 0                      # gpa x credits (0.5 each)
    course_breakdown = []                   # list of dictionaries

    for course in courses:
        cursor.execute("SELECT * FROM assessments WHERE course_id = ?", (course["id"],))        # for every course get all assessmnents
        assessments = cursor.fetchall()

        current_percent = calc_current_percent(assessments)             # calculate current grade on course based on assessments
        if current_percent is None:
            continue

        course_gpa = percent_to_gpa(current_percent)                # converts to gpa using the helper function
        weighted_total += course_gpa * 0.5                          # adds course gpa x 0.5 to the weighted total
        total_credits += 0.5                                        # counting the total credits

        course_breakdown.append({                       # adds dictionary for each course with its info
            "name": course["name"],
            "percent": current_percent,
            "gpa": course_gpa,
            "letter": gpa_to_letter(course_gpa)
        })

    conn.close()

    if total_credits == 0:                                                      # no completed courses (no credits)
        return jsonify({"cgpa": None, "total_credits": 0, "breakdown": []})

    cgpa = round(weighted_total / total_credits, 2)             # calculating cgpa

    return jsonify({                                            # sent back to js using json
        "cgpa": cgpa,
        "letter": gpa_to_letter(cgpa),
        "total_credits": total_credits,
        "breakdown": course_breakdown
    })



@app.route("/scale")
def scale():                                    # shows scale (just a static page)
    return render_template("scale.html")


create_tables()

if __name__ == "__main__":
    #create_tables()
    app.run(debug=True)
