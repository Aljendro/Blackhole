// This script runs in the context of web pages
// It can be used to monitor user activity to determine if the user is active

let lastActivity = Date.now();

// Listen for user interactions
document.addEventListener("mousemove", updateActivity);
document.addEventListener("keydown", updateActivity);
document.addEventListener("scroll", updateActivity);
document.addEventListener("click", updateActivity);

function updateActivity() {
  lastActivity = Date.now();
}
