
document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("loginForm");
    const inputStudentNum = document.getElementById("student_num");
  
    
    form.addEventListener("submit", function(event) {
        
       
    const numTrim = inputStudentNum.value.trim();

    
    if (!/^\d{9,10}$/.test(numTrim)) {
        alert("Your student number must be between 9 to 10 digits");
        event.preventDefault(); 
        return;
    }
    
    

    });

});

