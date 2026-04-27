

window.onload = loadCGPA;           // once refreshed, loadCGPA

function loadCGPA() {
    fetch("/get_cgpa")                  // sends a GET request to the get_cgpa route in flask
        .then(function(res){ 
            return res.json();          // that output is returned using json 
        })
        .then(function(data) {          // data is sent from flask to js

            if (data.cgpa === null) {                                       // if no cGPA is calculated
                document.getElementById("cgpa-value").textContent = "-"; 
                document.getElementById("cgpa-letter").textContent = "Your cGPA will appear here when courses are added.";
                document.getElementById("cgpa-credits").textContent = "0";
                return;
            }
                                                                                // set elements to the proper values from data
            document.getElementById("cgpa-value").textContent = data.cgpa;
            document.getElementById("cgpa-letter").textContent = data.letter;
            document.getElementById("cgpa-credits").textContent = data.total_credits;

            let rows = "";                                          // empty strig to build table rows

            for (let i = 0; i < data.breakdown.length; i++) {       // loops through each course in the list and appends the infp into a row
                let c = data.breakdown[i];
                rows += "<tr>";
                rows += "<td>" + c.name + "</td>";
                rows += "<td>" + c.percent + "%</td>";
                rows += "<td>" + c.gpa + "</td>";
                rows += "<td>" + c.letter + "</td>";
                rows += "</tr>";
            }

            document.getElementById("cgpa-breakdown").innerHTML =               // rows are wrapped in the table
                "<table>" + "<tr><th>Course</th><th>Grade</th><th>GPA Points</th><th>Letter</th></tr>" + rows + "</table>";
        });
}

