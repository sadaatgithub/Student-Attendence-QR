document.addEventListener("DOMContentLoaded", () => {
  const tabBtns = document.querySelectorAll(".tab-btn");
  const forms = document.querySelectorAll(".form");
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const registerRole = document.getElementById("registerRole");
  const studentOnlyFields = document.querySelector(".student-only");

  // Tab switching
  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;

      // Update active tab button
      tabBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      // Show corresponding form
      forms.forEach((form) => {
        form.classList.remove("active");
        if (form.id === `${tab}Form`) {
          form.classList.add("active");
        }
      });
    });
  });

  // Show/hide student ID field based on role
  registerRole.addEventListener("change", () => {
    studentOnlyFields.style.display =
      registerRole.value === "student" ? "block" : "none";
  });

  // Login form submission
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      console.log(data,"user data")
      

      if (response.ok) {
        // Store token and user data
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        // Redirect to appropriate dashboard
        window.location.href =
          data.user.role === "teacher"
            ? "/teacher-dashboard.html"
            : "/student-dashboard.html";
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error("Login error:", error);
      alert("An error occurred during login");
    }
  });

  // Register form submission
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = {
      name: document.getElementById("registerName").value,
      email: document.getElementById("registerEmail").value,
      password: document.getElementById("registerPassword").value,
      role: document.getElementById("registerRole").value,
      department: document.getElementById("registerDepartment").value,
      studentId:`${Date.now()}${Math.floor(Math.random() * 1000)
              .toString()
              .padStart(3, "0")}`
          
    };
    console.log(formData, "formData");
    // Add studentId only if role is student
    // if (formData.role === 'student') {
    //     formData.studentId = document.getElementById('registerStudentId').value;

    // }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        // Store token and user data
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        // Redirect to appropriate dashboard
        window.location.href =
          data.user.role === "teacher"
            ? "/teacher-dashboard.html"
            : "/student-dashboard.html";
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error("Registration error:", error);
      alert("An error occurred during registration");
    }
  });
});
