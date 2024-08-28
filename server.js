import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import fs from 'fs';

const app = express();
const upload = multer({ dest: 'uploads/' });

const apiKey = 'AIzaSyAHCaQ4LMUzg_hjizorUW69lBINGnDy1PY'; // Replace with your actual API key
const genAI = new GoogleGenerativeAI(apiKey);

app.use(cors());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Helper function to clean up uploaded files
function cleanUpFiles(files) {
  files.forEach(file => {
    fs.unlink(file.path, err => {
      if (err) console.error('Error deleting file:', err);
    });
  });
}

// Analyze images and generate persona, strategy, and schedule
app.post('/analyze', upload.array('images'), async (req, res) => {
  console.log('Analyze request received');
  try {
    const fileManager = new GoogleAIFileManager(apiKey);
    const files = req.files;
    const {
      name, company, jobTitle, personalStory, businessStory,
      targetSector, targetAudience, numPosts, timeline, purpose, goals, content
    } = req.body;

    if (!files || files.length === 0) {
      return res.status(400).send('No files uploaded.');
    }

    const uploadedFiles = [];
    for (const file of files) {
      const uploadedFile = await fileManager.uploadFile(file.path, {
        mimeType: file.mimetype,
        displayName: file.originalname,
      });
      uploadedFiles.push(uploadedFile.file);
      console.log('Uploaded file:', uploadedFile);
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const parts = uploadedFiles.map(file => ({
      fileData: {
        mimeType: file.mimeType,
        fileUri: file.uri,
      },
    }));

    parts.unshift({ text: `Analyze the provided LinkedIn post images for demographics, engagement, and writing style.` });
    parts.push({ text: 'Generate a detailed JSON object including the following fields: Name, Company, Job Title, Personal Story, Business Story, and Posts by the User.' });

    const generationConfig = {
      temperature: 1,
      topP: 0.95,
      topK: 64,
      maxOutputTokens: 8192,
      responseMimeType: 'text/plain',
    };

    const result = await model.generateContent(parts, generationConfig);
    const analytics = result.response.text();
    console.log('Analytics:', analytics);

    let analyticsJson;
    try {
      analyticsJson = JSON.parse(analytics);
    } catch (parseError) {
      console.warn('Failed to parse analytics as JSON, treating as plain text:', analytics);
      analyticsJson = { text: analytics };
    }

    // Persona Analysis
    const personaAnalysisPrompt = `Analyze the LinkedIn persona based on the following details:
    - Name: ${name}
    - Company: ${company}
    - Job Title: ${jobTitle}
    - Personal Story: ${personalStory}
    - Business Story: ${businessStory}

    Provide a comprehensive description of the persona's writing style, tone, and voice. Generate a JSON object with this analysis.`;

    const personaAnalysisParts = [{ text: personaAnalysisPrompt }];
    const personaAnalysisResult = await model.generateContent(personaAnalysisParts, generationConfig);

    const personaAnalysisJsonResult = personaAnalysisResult.response.text();
    console.log('Persona Analysis JSON Result:', personaAnalysisJsonResult);

    let personaAnalysisJson;
    try {
      personaAnalysisJson = JSON.parse(personaAnalysisJsonResult);
    } catch (parseError) {
      console.warn('Failed to parse persona analysis as JSON, treating as plain text:', personaAnalysisJsonResult);
      personaAnalysisJson = { text: personaAnalysisJsonResult };
    }

    // Strategy Analysis
    const strategyAnalysisPrompt = `Analyze the strategic content plan based on the following details:
    - Target Sector: ${targetSector}
    - Target Audience: ${targetAudience}
    - Number of Posts: ${numPosts}
    - Timeline: ${timeline}
    - Purpose: ${purpose}
    - Goals: ${goals}
    - Content: ${content}

    Generate a JSON output with the following fields:
    - Strategic Focus
    - Content Recommendations
    - Predicted Engagement Outcomes
    - Publishing Schedule`;

    const strategyAnalysisParts = [{ text: strategyAnalysisPrompt }];
    const strategyAnalysisResult = await model.generateContent(strategyAnalysisParts, generationConfig);

    const strategyAnalyticsJsonResult = strategyAnalysisResult.response.text();
    console.log('Strategy Analysis JSON Result:', strategyAnalyticsJsonResult);

    let strategyAnalyticsJson;
    try {
      strategyAnalyticsJson = JSON.parse(strategyAnalyticsJsonResult);
    } catch (parseError) {
      strategyAnalyticsJson = { text: strategyAnalyticsJsonResult };
    }

    // Publishing Schedule
    const schedulePrompt = `Create a LinkedIn publishing schedule based on the following details:

Persona Analysis: ${JSON.stringify(personaAnalysisJson)}
Strategy Data: ${JSON.stringify(strategyAnalyticsJson)}
Timeline: ${timeline}
Generate a detailed schedule that outlines specific dates and times for publishing posts that are aligned with the persona's style and the strategic goals. Each entry in the schedule should include the post topic, key message, and the best time to post for maximum engagement.

Based on this schedule, generate a series of LinkedIn posts tailored to the persona ${name}:

Persona Analysis: ${JSON.stringify(personaAnalysisJson)}
Strategy Data: ${JSON.stringify(strategyAnalyticsJson)}
The posts should be:

Engaging and relevant to the target audience
Aligned with the specified goals and content plan
Incorporate the personal story: "${personalStory}" to make the content relatable and impactful.
For each post, provide:

The suggested publication date and time.
The complete LinkedIn post content, including headline, body text, hashtags, and any calls to action.`;

    const scheduleParts = [{ text: schedulePrompt }];
    const scheduleResult = await model.generateContent(scheduleParts, generationConfig);

    console.log('Publishing Schedule:', scheduleResult.response.text());

    const response = {
      publishingSchedule: scheduleResult.response.text(),
      analyticsJson,
      personaAnalysisJson,
      strategyAnalyticsJson
    };

    res.send(response);
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).send('Internal Server Error');
  } finally {
    cleanUpFiles(req.files);
  }
});

// Regenerate LinkedIn post
app.post('/regenerate', async (req, res) => {
  console.log('Regenerate request received');
  try {
    const { name, company, jobTitle, personalStory, businessStory, lastGeneratedPost, personaAnalysisJson, strategyAnalyticsJson } = req.body;

    if (!lastGeneratedPost) {
      return res.status(400).send('Last generated post is required.');
    }

    const prompt = `Generate a series of LinkedIn posts tailored to the persona ${name} based on the following details:
    - Persona Analysis: ${JSON.stringify(personaAnalysisJson)}
    - Strategy Analysis: ${JSON.stringify(strategyAnalyticsJson)}

    The posts should be engaging, relevant to the target audience, and aligned with the specified goals and content plan. Incorporate the personal story: "${personalStory}" to make the content relatable and impactful.`;

    const linkedinParts = [{ text: prompt }];
    const linkedinModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const linkedinResult = await linkedinModel.generateContent(linkedinParts);

    console.log('Regenerated LinkedIn Post:', linkedinResult.response.text());
    res.send(linkedinResult.response.text());
  } catch (error) {
    console.error('Error during regeneration:', error.message);
    res.status(500).send('Failed to regenerate LinkedIn post');
  }
});

app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});
