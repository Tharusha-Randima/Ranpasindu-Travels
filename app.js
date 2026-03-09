    
    // 1. Handle Login
    function handleLogin(event) {
        event.preventDefault();
        const email = document.getElementById('email').value;
        const pass = document.getElementById('pass').value;

        if (email === "admin@bus.com" && pass === "admin") {
            sessionStorage.setItem("isLoggedIn", "true");
            sessionStorage.setItem("userRole", "admin");
            window.location.href = "admin.html";
        } else if (email === "user@bus.com" && pass === "user123") {
            sessionStorage.setItem("isLoggedIn", "true");
            sessionStorage.setItem("userRole", "user");
            window.location.href = "user.html";
        } else {
            alert("Invalid Login!");
        }
    }

    // 2. Security Bouncer (Run this on every page)
    function checkAccess(requiredRole) {
        const loggedIn = sessionStorage.getItem("isLoggedIn");
        const role = sessionStorage.getItem("userRole");

        if (loggedIn !== "true" || (requiredRole && role !== requiredRole)) {
            window.location.replace("index.html");
        }
    }

    // 3. Logout Function
    function logout() {
        sessionStorage.clear();
        window.location.replace("index.html");
    }

    //user page

        // Handle Data Submission
        document.getElementById('busEntryForm')?.addEventListener('submit', function(e) {
        e.preventDefault();

        // Create a data object
        const dailyData = {
            date: new Date().toLocaleDateString(),
            driver: document.getElementById('driverName').value,
            turns: {
                t7am: Number(document.getElementById('turn1').value) || 0,
                t8am: Number(document.getElementById('turn2').value) || 0,
                t930am: Number(document.getElementById('turn3').value) || 0,
                t210pm: Number(document.getElementById('turn4').value) || 0,
                t330pm: Number(document.getElementById('turn5').value) || 0,
                t510pm: Number(document.getElementById('turn6').value) || 0
            },
            expenses: {
                fuel: Number(document.getElementById('fuelCost').value) || 0,
                food: Number(document.getElementById('foodCost').value) || 0,
                other1: Number(document.getElementById('other1').value) || 0,
                other2: Number(document.getElementById('other2').value) || 0
            }
        };

        // Calculate Totals
        const totalIncome = Object.values(dailyData.turns).reduce((a, b) => a + b, 0);
        const totalExpense = Object.values(dailyData.expenses).reduce((a, b) => a + b, 0);
        dailyData.netProfit = totalIncome - totalExpense;

        // Save to "Database" (LocalStorage)
        let allReports = JSON.parse(localStorage.getItem('busReports')) || [];
        allReports.push(dailyData);
        localStorage.setItem('busReports', JSON.stringify(allReports));

        alert("Report Submitted Successfully!");
        this.reset(); // Clear the form
    });

    //admin page
    // Function to display data in the Admin Table
    function displayReports() {
        const reportsBody = document.getElementById('reportsBody');
        if (!reportsBody) return; // Only run if we are on the admin page

        const allReports = JSON.parse(localStorage.getItem('busReports')) || [];
        
        reportsBody.innerHTML = ""; // Clear existing rows

        allReports.forEach(report => {
            // Calculate totals for the row
            const income = Object.values(report.turns).reduce((a, b) => a + b, 0);
            const expense = Object.values(report.expenses).reduce((a, b) => a + b, 0);
            const profit = income - expense;

            const row = `
                <tr>
                    <td>${report.date}</td>
                    <td>${report.driver}</td>
                    <td>${income.toLocaleString()} LKR</td>
                    <td>${expense.toLocaleString()} LKR</td>
                    <td style="font-weight:bold; color: ${profit >= 0 ? 'green' : 'red'}">
                        ${profit.toLocaleString()} LKR
                    </td>
                </tr>
            `;
            reportsBody.innerHTML += row;
        });
    }

    // Function to clear all data (for testing)
    function clearData() {
        if (confirm("Are you sure you want to delete all reports?")) {
            localStorage.removeItem('busReports');
            displayReports();
        }
    }

    //admin summery
    // Calculate Grand Totals for the Dashboard
    const grandRevenue = allReports.reduce((sum, r) => sum + Object.values(r.turns).reduce((a,b)=>a+b,0), 0);
    const grandProfit = allReports.reduce((sum, r) => sum + (Object.values(r.turns).reduce((a,b)=>a+b,0) - Object.values(r.expenses).reduce((a,b)=>a+b,0)), 0);

    document.getElementById('totalRevenue').innerText = `${grandRevenue.toLocaleString()} LKR`;
    document.getElementById('totalProfit').innerText = `${grandProfit.toLocaleString()} LKR`;

    //save data to cloud - firebase
    // NEW: Save to Cloud
    function saveReportToCloud(dailyData) {
    // This creates a folder named "reports" in the cloud
    const reportsRef = database.ref('reports');
    
    // .push() generates a unique ID for every entry automatically
    reportsRef.push(dailyData)
        .then(() => {
            alert("Sent to Cloud Successfully!");
        })
        .catch((error) => {
            console.error("Cloud Error:", error);
        });
    }

    // Admin table can update automatically the moment a driver hits submit
    function listenToCloudReports() {
    const reportsRef = database.ref('reports');
    
    // .on('value') means: Whenever the database changes, run this code!
    reportsRef.on('value', (snapshot) => {
        const data = snapshot.val();
        const reportsBody = document.getElementById('reportsBody');
        if (!reportsBody || !data) return;

        reportsBody.innerHTML = ""; // Clear table
        
        // Loop through the cloud data
        Object.values(data).forEach(report => {
            // ... (Your existing logic to create table rows) ...
            // Use the same row creation code we wrote before!
        });
        
        // Re-calculate totals
        calculateGrandTotals(Object.values(data));
    });
    }

    // Add this function to your script. It takes the data from Firebase and updates those black summary boxes we built earlier.
    function calculateGrandTotals(reportsArray) {
    let totalRevenue = 0;
    let totalProfit = 0;

    reportsArray.forEach(report => {
        // Sum up all 6 turns for this specific report
        const dayIncome = Object.values(report.turns).reduce((a, b) => a + b, 0);
        
        // Sum up all expenses for this specific report
        const dayExpense = Object.values(report.expenses).reduce((a, b) => a + b, 0);
        
        const dayProfit = dayIncome - dayExpense;

        totalRevenue += dayIncome;
        totalProfit += dayProfit;
    });

    // Update the UI
    const revEl = document.getElementById('totalRevenue');
    const profEl = document.getElementById('totalProfit');

    if (revEl && profEl) {
        revEl.innerText = `${totalRevenue.toLocaleString()} LKR`;
        profEl.innerText = `${totalProfit.toLocaleString()} LKR`;
        
        // Change color to red if the business is currently in a loss
        profEl.style.color = totalProfit >= 0 ? "#4CAF50" : "#FF5252";
    }
    }