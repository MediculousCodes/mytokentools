// Get DOM elements
const fileInput = document.getElementById("fileInput")
const fileName = document.getElementById("fileName")
const calculateBtn = document.getElementById("calculateBtn")
const resultDiv = document.getElementById("result")
const tokenCountSpan = document.getElementById("tokenCount")
const errorDiv = document.getElementById("error")

// Backend API URL - uses docker-compose service name
const API_URL = "http://localhost:5000"

let fileContent = ""

// Handle file selection
fileInput.addEventListener("change", (event) => {
  const file = event.target.files[0]

  if (file) {
    // Update UI to show selected file name
    fileName.textContent = file.name

    // Read file content
    const reader = new FileReader()

    reader.onload = (e) => {
      fileContent = e.target.result
      calculateBtn.disabled = false
      hideError()
      hideResult()
    }

    reader.onerror = () => {
      showError("Error reading file. Please try again.")
      calculateBtn.disabled = true
    }

    reader.readAsText(file)
  } else {
    fileName.textContent = "Choose a .txt file"
    calculateBtn.disabled = true
    fileContent = ""
  }
})

// Handle calculate button click
calculateBtn.addEventListener("click", async () => {
  if (!fileContent) {
    showError("Please select a file first.")
    return
  }

  // Disable button and show loading state
  calculateBtn.disabled = true
  calculateBtn.textContent = "Calculating..."
  hideError()
  hideResult()

  try {
    // Send request to backend
    const response = await fetch(`${API_URL}/tokenize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: fileContent }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    if (data.error) {
      throw new Error(data.error)
    }

    // Display result
    showResult(data.token_count)
  } catch (error) {
    console.error("Error:", error)
    showError(`Failed to calculate tokens: ${error.message}`)
  } finally {
    // Re-enable button
    calculateBtn.disabled = false
    calculateBtn.textContent = "Calculate Tokens"
  }
})

// Helper functions
function showResult(count) {
  tokenCountSpan.textContent = count.toLocaleString()
  resultDiv.classList.remove("hidden")
}

function hideResult() {
  resultDiv.classList.add("hidden")
}

function showError(message) {
  errorDiv.textContent = message
  errorDiv.classList.remove("hidden")
}

function hideError() {
  errorDiv.classList.add("hidden")
}
