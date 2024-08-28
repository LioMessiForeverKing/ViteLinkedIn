document.getElementById('fileInput').addEventListener('change', handleFileSelect);
document.getElementById('analyzeButton').addEventListener('click', analyzeImages);
document.getElementById('regenerateButton').addEventListener('click', regeneratePost);

let files = [];
let lastGeneratedPost = ''; // Store the last generated post

async function handleFileSelect(event) {
  const fileInput = event.target;
  const imageContainer = document.getElementById('imageContainer');
  imageContainer.innerHTML = ''; // Clear previous images

  files = Array.from(fileInput.files);
  files.forEach(file => {
    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    img.onload = () => URL.revokeObjectURL(img.src); // Clean up memory
    imageContainer.appendChild(img);
  });
}

async function analyzeImages() {
  if (files.length === 0) {
    alert('Please select images to analyze.');
    return;
  }

  const formData = new FormData();
  files.forEach(file => formData.append('images', file));

  // Retrieve persona-related inputs
  const name = document.getElementById('name').value;
  const company = document.getElementById('company').value;
  const jobTitle = document.getElementById('jobTitle').value;
  const personalStory = document.getElementById('personalStory').value;
  const businessStory = document.getElementById('businessStory').value;

  // Retrieve strategy-related inputs
  const targetSector = document.getElementById('targetSector').value;
  const targetAudience = document.getElementById('targetAudience').value;
  const numPosts = document.getElementById('numPosts').value;
  const timeline = document.getElementById('timeline').value;
  const purpose = document.getElementById('purpose').value;
  const goals = document.getElementById('goals').value;
  const content = document.getElementById('content').value;

  // Append all inputs to the formData
  formData.append('name', name);
  formData.append('company', company);
  formData.append('jobTitle', jobTitle);
  formData.append('personalStory', personalStory);
  formData.append('businessStory', businessStory);
  formData.append('targetSector', targetSector);
  formData.append('targetAudience', targetAudience);
  formData.append('numPosts', numPosts);
  formData.append('timeline', timeline);
  formData.append('purpose', purpose);
  formData.append('goals', goals);
  formData.append('content', content);

  try {
    const response = await fetch('http://localhost:3000/analyze', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Network response was not ok: ${response.statusText}`);
    }

    const result = await response.json(); // Expecting JSON response

    lastGeneratedPost = result.linkedinPost; // Store the generated post in a variable

    // Save the last generated post, persona analysis, and strategy analysis in localStorage
    localStorage.setItem('lastGeneratedPost', lastGeneratedPost);
    localStorage.setItem('personaAnalysisJson', JSON.stringify(result.personaAnalysisJson));
    localStorage.setItem('strategyAnalyticsJson', JSON.stringify(result.strategyAnalyticsJson));

    const resultTextElement = document.getElementById('resultText');
    if (resultTextElement) {
      // Render the LinkedIn post as Markdown
      resultTextElement.innerHTML = marked(result.linkedinPost); // Display LinkedIn post
    }

    const regenerateButton = document.getElementById('regenerateButton');
    if (regenerateButton) {
      regenerateButton.style.display = 'block'; // Show regenerate button
    }

    const analyzeButton = document.getElementById('analyzeButton');
    if (analyzeButton) {
      analyzeButton.style.display = 'none'; // Hide analyze button
    }

    // Display the publishing schedule
    displayPublishingSchedule(result.publishingSchedule);

  } catch (error) {
    console.error('Error:', error);
    const resultTextElement = document.getElementById('resultText');
    if (resultTextElement) {
      resultTextElement.innerText = 'An error occurred while analyzing the images.';
    }
  }
}

// Function to display the publishing schedule
function displayPublishingSchedule(schedule) {
  const scheduleContainer = document.getElementById('scheduleOutput');
  if (!scheduleContainer) {
    console.error('Schedule container not found');
    return;
  }

  scheduleContainer.innerHTML = ''; // Clear previous schedule

  if (Array.isArray(schedule)) {
    const ul = document.createElement('ul');
    schedule.forEach(item => {
      const li = document.createElement('li');
      li.innerText = item; // Assuming each item in the schedule array is a string (like a post date or content)
      ul.appendChild(li);
    });
    scheduleContainer.appendChild(ul);
  } else if (typeof schedule === 'string') {
    const p = document.createElement('p');
    p.innerText = `Publishing Schedule:\n${schedule}`;
    scheduleContainer.appendChild(p);
  } else {
    scheduleContainer.innerHTML = 'No publishing schedule available.';
  }
}

// New function to regenerate the response
async function regeneratePost() {
  const lastGeneratedPost = localStorage.getItem('lastGeneratedPost');
  const personaAnalysisJson = localStorage.getItem('personaAnalysisJson');
  const strategyAnalyticsJson = localStorage.getItem('strategyAnalyticsJson');

  if (!lastGeneratedPost) {
    alert('No post available to regenerate.');
    return;
  }

  // Retrieve persona-related inputs
  const name = document.getElementById('name').value;
  const company = document.getElementById('company').value;
  const jobTitle = document.getElementById('jobTitle').value;
  const personalStory = document.getElementById('personalStory').value;
  const businessStory = document.getElementById('businessStory').value;

  const formData = {
    name,
    company,
    jobTitle,
    personalStory,
    businessStory,
    lastGeneratedPost,
    personaAnalysisJson,
    strategyAnalyticsJson
  };

  try {
    const response = await fetch('http://localhost:3000/regenerate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });

    if (!response.ok) {
      throw new Error(`Network response was not ok: ${response.statusText}`);
    }

    const result = await response.text();
    const resultTextElement = document.getElementById('resultText');
    if (resultTextElement) {
      // Render the regenerated LinkedIn post as Markdown
      resultTextElement.innerHTML = marked(result); // Display regenerated LinkedIn post
    }
  } catch (error) {
    console.error('Error during regeneration:', error);
    const resultTextElement = document.getElementById('resultText');
    if (resultTextElement) {
      resultTextElement.innerText = 'An error occurred while regenerating the post.';
    }
  }
}
