let openCourseId = null;    // used to make sure that when the pahe is refreshed, it returns to the same spot in the page

window.onload = function() {    // this is ran when the web page has fully loaded, so loadCourses() would run as soon as refreshed
    loadCourses();
};


// this s a helper function that sends POST requests to the server (don't need to fetch logic for each functon)

function postForm(url, data) {                  // URL for where to send the POST reuqest, and data is the what is being sent
    let body = "";
    let keys = Object.keys(data);              // gets the keys from "data" -> which can be name, weight for {name: "CSCB20", weight: 30}
    
    for (let i = 0; i < keys.length; i++) {     // looping through each key
        if (i > 0){
            body += "&";                        // fills the body by putting & after each key-value pair (but not at beginning)
        }
        body += keys[i] + "=" + encodeURIComponent(data[keys[i]]);  // gets current key-value pair, converts the values into characters comptible for URL
    }
    return fetch(url, {     // sends HTTP reuqest then returns it
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },   //tells server what the format is key=value&key=value
        body: body                                                          // attaches string to body as the content being sent in the reuquest
    });
}


//adding course
function addCourse() {
    const name = document.getElementById("course-name").value.trim().toUpperCase();     // trims white space and converts to uppercase (so all consistent)

    if (!name){                                     // alert if name field is empty
        alert("Please enter the course code.");
        return;
    }

    if(name.length != 6){                           // alert if name field is not 6 chaacters (CSCB20)
        alert("Course code must be 6 characters.");
        return;
    }

    if (!/^[A-Z]{4}\d{2}$/.test(name)) {                    // uses regex to make sure there are 4 uppercase letters and 2 digits (alert if not)
        alert("Course code must be in the proper format (e.g. CSCB20)");
        return;
    }


    postForm("/add_course", { name: name }).then(function() {       // calls helper postFOrm() with the course name as the data
        document.getElementById("course-name").value = "";          // after the server responds, text field is set to empty string
        loadCourses();                                              // run loadCourses()
    });
}


// when a course is deleted
function deleteCourse(courseId) {
    if (!confirm("Are you sure you want to delete this course and all of its assessments?")){   // confirmation
        return;
    }
    postForm("/delete_course", { course_id: courseId }).then(function() { // sends to route /delete_course with the course id data
        openCourseId = null;                // no panel is reopened (not reopening what was just deleted)
        loadCourses();
    });
}



// for everytme page loads, course saved or deleted, 
function loadCourses() {
    fetch("/get_courses")           // gets (GET reuqest) the student's courses from the /get_courses route (which does the queries to retrieve it)
        .then(function(res) {               // res -> HTTP response sent by the sever converted to something more readable to js using json
            return res.json(); 
        })
        .then(function(courses) {       // once the data is ready this function runs
            const area = document.getElementById("courses-area");   // html element to input message

            if (courses.length === 0) {     // html message if there are no courses in array
                area.innerHTML = '<div class="card" style="color:#888; text-align:center; padding:40px;">There are no courses yet. Add your first one!</div>';
                return;
            }

            let html = "";                  // html that will get accumulated

            for (let i = 0; i < courses.length; i++) {          // goes through each course in the array
                let c = courses[i];

                let badgeClass = "";                            // initializing a css class for badge colour
                if (c.current_percent !== null) {               // assigning badge colour for the course grade (if its not empty)
                    if (c.current_percent >= 73){ 
                        badgeClass = "good";
                    }
                    else if (c.current_percent >= 60){
                        badgeClass = "ok";
                    }
                    else{                              
                        badgeClass = "poor";
                    }
                }

                let badgeText;
                    if(c.current_percent !== null) {
                        badgeText = c.current_percent + "%  •  " + c.current_letter;
                    } 
                    else {
                        badgeText = "No grades yet";
                    }

                    // filling the html course card
                html += '<div class="course-card">';
                html += '<div class="course-card-header">';
                html += "<h3>" + c.name + "</h3>";
                html += '<div class="header-right">';
                html += '<span class="grade-badge ' + badgeClass + '">' + badgeText + "</span>";
                html += '<button class="btn-danger" onclick="deleteCourse(' + c.id + ')">Delete</button>';
                html += '<button class="toggle-btn" onclick="toggleDetails(' + c.id + ')">▼ Details</button>';  // runs toggleDetails() which just shows the panel
                html += "</div></div>";
                html += '<div id="details-' + c.id + '" style= "display:none;" class="course-card-body">';  // not displayed unless toglg clicked
                html += buildCourseBody(c);     // appends body to the existing html (building upon the html for every added course)
                html += "</div></div>";
            }
            area.innerHTML = html;  //puts onto page
            


            if (openCourseId !== null) {                                            // if the panel was open before refreshed
                const panel = document.getElementById("details-" + openCourseId);
                if (panel){
                    panel.style.display = "block";                                  // displays the current panel with courseID
                }
            }
        });
}



function toggleDetails(courseId) {                                  // courseID of the course button that was clicked
    const panel = document.getElementById("details-" + courseId);       // finds the "details" panel for the specific course
    
    if (panel.style.display === "none") {
        panel.style.display = "block";          // showing the panel if its not shown
        openCourseId = courseId;                // openCourseId = current course id so when refreshed, that course stays open
    } 
    else {
        panel.style.display = "none";           // not showing the panel if its shown
        openCourseId = null;
    }
}



function buildCourseBody(course) {
    const id = course.id;
    let html = "";                      // html empty string to accumulate


    html += buildFeedback(course);      // for the feedback

    html += "<h3>Assessments</h3>";         // for the assessments

    if (course.assessments.length === 0) {                                                   // html/css layout if there are no courses 
        html += '<p style="color:#888; font-size:0.88rem;">No assessments added yet.</p>';
    } 
    else{
        let rows = "";

        for (let i = 0; i < course.assessments.length; i++) {
            let a = course.assessments[i];


            let gradeVal;
            if (a.grade !== null) {         // shows the grade or empty string whethor it exists or not
                gradeVal = a.grade;
            } 
            else {
                gradeVal = "";
            }
            
            rows += "<tr>";                         // adds new table row
            rows += "<td>" + a.name + "</td>";
            rows += '<td><span class="type-badge type-' + a.type.toLowerCase() + '">' + a.type + "</span></td>";        // badge for assignment/test type
            rows += "<td>" + a.weight + "%</td>";
            rows += "<td>";
            rows += '<input class="grade-input" type="number" id="grade-input-' + a.id + '" min="0" max="100" step="0.1" value="' + gradeVal + '" placeholder="—" />';
            rows += '<button class="btn-small" onclick="saveGrade(' + a.id + ", " + id + ')">Save</button>';
            rows += "</td>";
            rows += '<td><button class="btn-danger" onclick="deleteAssessment(' + a.id + ", " + id + ')">✕</button></td>';
            rows += "</tr>";
        }

        html += "<table>";                                                                          // adds all rows to the tab;e
        html += "<tr><th>Name</th><th>Type</th><th>Weight</th><th>Grade</th><th></th></tr>";
        html += rows;
        html += "</table>";
    }

                                                                     // for adding an assessmrnt
    html += '<h3 style="margin-top:18px;">Add Assessment</h3>';
    html += '<div class="form-row">';
    html += '<div class="form-group"><label>Type</label>';
    html += '<select id="atype-' + id + '">';
    html += '<option value="Assignment">Assignment</option>';
    html += '<option value="Test">Test</option>';
    html += "</select></div>";
    html += '<div class="form-group"><label>Name</label>';
    html += '<input type="text" id="aname-' + id + '" placeholder="e.g. Midterm" style="width:140px;" /></div>';
    html += '<div class="form-group"><label>Weight (%)</label>';
    html += '<input type="number" id="aweight-' + id + '" min="0" max="100" placeholder="30" style="width:80px;" /></div>';
    html += '<div class="form-group"><label>Grade (%) — optional</label>';
    html += '<input type="number" id="agrade-' + id + '" min="0" max="100" placeholder="leave blank" style="width:120px;" /></div>';
    html += '<button onclick="addAssessment(' + id + ')" style="align-self:flex-end;">Add</button>';
    html += "</div>";

                        // what do i need calculator
    html += '<div class="needs-box"><h3>What grade do I need?</h3><p><small>Select your target GPA for the course to see the grade you need on remaining assignments to achieve it.</small></p>';
    html += '<div class="form-row"><div class="form-group"><label>Target GPA</label>';
    html += '<select id="target-gpa-' + id + '">';
    html += '<option value="4.0" selected>A+ (4.0) — 85%+</option>';
    html += '<option value="3.7">A  (3.7) — 80%+</option>';
    html += '<option value="3.3">A- (3.3) — 77%+</option>';
    html += '<option value="3.0">B+ (3.0) — 73%+</option>';
    html += '<option value="2.7">B  (2.7) — 70%+</option>';
    html += '<option value="2.3">B- (2.3) — 67%+</option>';
    html += '<option value="2.0">C+ (2.0) — 63%+</option>';
    html += '<option value="1.7">C  (1.7) — 60%+</option>';
    html += '<option value="1.3">C- (1.3) — 57%+</option>';
    html += '<option value="1.0">D+ (1.0) — 53%+</option>';
    html += '<option value="0.7">D  (0.7) — 50%+</option>';
    html += "</select></div>";
    html += '<button onclick="whatDoINeed(' + id + ')" style="align-self:flex-end;">Calculate</button>';
    html += "</div>";
    html += '<p id="needs-result-' + id + '"></p></div>';

    return html;                    // return accumulated html
}



function buildFeedback(course) {
    let html = "";

            // comparing with the class average
    if (course.current_percent !== null && course.class_avg !== null) {
        const diff = (course.current_percent - course.class_avg).toFixed(1);        // calculate difference in avg and grade & gives message
        if (diff > 0) {
            html += '<div class="feedback-box feedback-green"> You are ' + diff + '% above the class average of ' + course.class_avg + '%.</div>';
        } 
        else if (diff < 0) {
            html += '<div class="feedback-box feedback-red"> You are ' + Math.abs(diff) + '% below the class average of ' + course.class_avg + '%.</div>';
        } 
        else {
            html += '<div class="feedback-box feedback-blue">You are right at the class average! (' + course.class_avg + '%).</div>';
        }
    }
    else{
        html += '<div class="feedback-box feedback-blue">Nothing to compare at the moment.</div>';
    }



                                        // course rating
    if (course.avg_rating !== null) {
        let stars = "★".repeat(Math.round(course.avg_rating)) + "☆".repeat(5 - Math.round(course.avg_rating));  // using Math.round() and .repeat() to 
                                                                                                                // repeat the stars and round to nearest int

        html += '<div class="feedback-box feedback-blue">' + stars + ' Other students who have completed ' + course.name + ' have rated it an average of ' + course.avg_rating + ' / 5.</div>';
    }



    if (course.avg_assignment !== null && course.avg_test !== null) {           // feedback for assignment and test
        const diff = course.avg_assignment - course.avg_test;
        if (diff > 5) {
            html += '<div class="feedback-box feedback-yellow"> You perform better on <strong>Assignments</strong> (avg ' + course.avg_assignment + '%) than Tests (avg ' + course.avg_test + '%).</div>';
        } 
        else if (diff < -5) {
            html += '<div class="feedback-box feedback-yellow"> You perform better on <strong>Tests</strong> (avg ' + course.avg_test + '%) than Assignments (avg ' + course.avg_assignment + '%).</div>';
        } 
        else {
            html += '<div class="feedback-box feedback-blue">Your assignment average (' + course.avg_assignment + '%) and test average (' + course.avg_test + '%) are similar!</div>';
        }
    } 
    else if (course.avg_assignment !== null) {
        html += '<div class="feedback-box feedback-blue">Assignment average: ' + course.avg_assignment + '% (test grades have not been entered yet).</div>';
    } 
    else if (course.avg_test !== null) {
        html += '<div class="feedback-box feedback-blue">Test average: ' + course.avg_test + '% (assignment grades have not been entered yet).</div>';
    }


    if (course.is_complete && course.my_rating === null) {                      // building html so student can rate the course
        html += '<div class="feedback-box feedback-green"> Congratulations! You have completed ' + course.name + '. Rate this course:';
        html += '<div class="star-rating">';
        html += '<select id="rating-select-' + course.id + '">';
        html += '<option value="5" selected>★★★★★ (5)</option>';
        html += '<option value="4">★★★★☆ (4)</option>';
        html += '<option value="3">★★★☆☆ (3)</option>';
        html += '<option value="2">★★☆☆☆ (2)</option>';
        html += '<option value="1">★☆☆☆☆ (1)</option>';
        html += "</select>";
        html += '<button class="btn-small" onclick="submitRating(' + course.id + ", '" + course.name + "'" + ')">Submit Rating</button>';
        html += "</div></div>";
    } 
    else if (course.is_complete && course.my_rating !== null) {                         // html if course is completed & rated
        let stars = "★".repeat(course.my_rating) + "☆".repeat(5 - course.my_rating);
        html += '<div class="feedback-box feedback-green"> Congratulations! You have completed ' + course.name + ' and rated it ' + stars + ' (' + course.my_rating + '/5).</div>';
    }

    return html;
}


function addAssessment(courseId) {                          // retrieving values for assessments
    const name = document.getElementById("aname-" + courseId).value.trim();
    const atype = document.getElementById("atype-" + courseId).value;
    const weight = document.getElementById("aweight-" + courseId).value;
    const grade = document.getElementById("agrade-" + courseId).value;

    if (!name || !weight) {                             //valdation if empty
        alert("Please fill in the name and weight.");
        return;
    }

    // sends to the route in app.py
    postForm("/add_assessment", { course_id: courseId, name: name, type: atype, weight: weight, grade: grade }).then(function() {
        openCourseId = courseId;            // once flask does its work in the route, the courseid is saved so it is automatically loaded when refreshed
        loadCourses();
    });
}


function saveGrade(assessmentId, courseId) {            // passing assesment and course id

    const grade = document.getElementById("grade-input-" + assessmentId).value; // getting grade and sends to route in app.py
    postForm("/update_grade", { assessment_id: assessmentId, grade: grade }).then(function() {
        openCourseId = courseId;                // remains after refresh
        loadCourses();
    });
}


function deleteAssessment(assessmentId, courseId) {
    if (!confirm("Delete this assessment?")) return;                // confirm for delete

    postForm("/delete_assessment", { assessment_id: assessmentId }).then(function() {   // sends to app.py, then courseId remains after refresh
        openCourseId = courseId;
        loadCourses();
    });
}



function submitRating(courseId, courseName) {               // courseId and coursename of what is being rated
    const rating = document.getElementById("rating-select-" + courseId).value;                   // gets the rating dropdown

    postForm("/rate_course", { course_name: courseName, rating: rating }).then(function() {     // sends to app.py, then courseId set to remain after refresh
        openCourseId = courseId;
        loadCourses();
    });
}



function whatDoINeed(courseId) {
    const targetGPA = document.getElementById("target-gpa-" + courseId).value;      //gets the selected value fror target gpa

    postForm("/what_do_i_need", { course_id: courseId, target_gpa: targetGPA }) // sends to app.py
        .then(function(res) { return res.json(); })                             // uses json to convert flask's response to more readable
        .then(function(data) {
            const el = document.getElementById("needs-result-" + courseId);     // gets the element to display message
            el.textContent = data.message;

            if (data.message.includes("Not possible")) {        // sets CSS class depending on the message
                el.className = "result-bad";
            } else {
                el.className = "result-good";
            }
        });
}
