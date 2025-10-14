# Face ID — Full Process (Simple English)

This document explains how the Face ID feature works in the project and how to set it up. I use simple English and short steps.

## Overview

Face ID has two main parts:

1. Face model files (these are the neural network weights). They must be downloaded and served from your web app (example: `/models`).
2. Frontend code that uses face-api.js to detect faces and create a numeric "embedding" (a list of numbers) for each person. These embeddings are saved to the server and used later to match people.

The common flow:
- When an admin enrolls their face, the app captures a camera image, runs face detection and face recognition models, and gets a 128-length or 512-length vector called embedding.
- The embedding is sent to the server and stored on the user record.
- When someone tries to login with Face ID, the app captures a live embedding and compares it with stored embeddings. If similarity is high enough, login succeeds.

## Libraries used

- face-api.js — main library for face detection, landmarks, and face descriptors (embeddings).
  - NPM package: `face-api.js`
- react-webcam — to access the camera and capture frames.
  - NPM package: `react-webcam`
- axios (already in project) — used to call server APIs.

Install commands (run in `client` folder):

```bash
# inside client folder
npm install face-api.js react-webcam
# or with yarn
# yarn add face-api.js react-webcam
```

> Note: `face-api.js` uses model files (JSON + binary). Installing the NPM package does NOT include the model files automatically.

## Model files (very important)

You must download the model files and put them under `client/public/models` so they are served at `/models/*`.

Required models (minimum):
- tiny_face_detector_model-weights_manifest.json + binaries (for fast face detection)
- face_landmark_68_model-weights_manifest.json + binaries (for landmarks)
- face_recognition_model-weights_manifest.json + binaries (for embeddings)

Where to get them:
- Official repo or built releases of face-api.js. Search for "face-api.js models" and download the `models` folder.

How to place them:
- Put the whole `models` folder (with JSON and binary files) into `client/public/models`.
- Restart your dev server if it is running.

Why local models?
- Browsers block cross-origin requests to the official hosted model files in many setups (CORS). Serving them from your site avoids CORS errors.

## Frontend flow (step-by-step)

1. Load models on app or page start:
   - Call `faceapi.nets.tinyFaceDetector.loadFromUri('/models')`, `faceapi.nets.faceLandmark68Net.loadFromUri('/models')`, `faceapi.nets.faceRecognitionNet.loadFromUri('/models')`.
   - If these fail, show an error telling the developer to place models under `/public/models`.

2. Open webcam (react-webcam)
   - Show a small modal or UI with the camera preview.
   - Optionally, start a lightweight loop that checks for a face every 500–800 ms using `faceapi.detectSingleFace(video, options)`.

3. When a face is detected and the user accepts (press Save), capture a frame and compute embedding:
   - `faceapi.detectSingleFace(video, options).withFaceLandmarks().withFaceDescriptor()`
   - Convert descriptor (Float32Array) to `number[]` (for JSON-safe transport). Optionally round values.

4. Send embedding to server:
   - POST to your API: `POST /api/users/:id/face-embedding` with a JSON body like `{ embedding: number[] }`.
   - Server should save embedding on user record.

5. Matching during Face Login:
   - Capture live embedding as above.
   - Fetch candidate embeddings (or all users with embeddings) from server.
   - Compute Euclidean distance or cosine similarity between live embedding and stored embeddings.
   - If distance < threshold (commonly 0.6 for face-api descriptors), treat as match.

## Server-side storage

- Store the embedding as an array of numbers (Float32 -> number[]). Save in a JSON field or an array column depending on your DB.
- Keep only one embedding per user (or an array of multiple embeddings for robustness).
- When matching, send candidates to the frontend or implement matching server-side.

## Thresholds and tuning

- Euclidean distance threshold typical: 0.4 - 0.7. Start with 0.6 and adjust.
- Use `face-api.js` face recognition model (512-length) for higher accuracy or tiny models for faster inference.

## Security & privacy

- Face embeddings are sensitive. Treat them like passwords:
  - Store securely.
  - Use HTTPS between client and server.
  - Consider encrypting embeddings at rest.

## Troubleshooting

- CORS errors when loading models: ensure models are served from the same origin (`/models`). Do not load directly from external hosts.
- No camera access: check browser permissions and `https` requirement (some browsers require secure contexts for camera access).
- Face not detected: try larger `inputSize` in `TinyFaceDetectorOptions`, increase `scoreThreshold` tolerance, or change lighting and camera distance.
- Embeddings all zeros or invalid: ensure models are the correct versions and not corrupted.

## Example code snippets (React)

Load models:

```ts
await Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
  faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
  faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
]);
```

Capture embedding:

```ts
const video = webcamRef.current?.video as HTMLVideoElement | undefined;
const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.5 });
const detection = await faceapi
  .detectSingleFace(video, options)
  .withFaceLandmarks()
  .withFaceDescriptor();
if (!detection) return null;
const embedding = Array.from(detection.descriptor as Float32Array);
```

Send to server (example):

```ts
await axios.post(`/api/users/${userId}/face-embedding`, { embedding });
```

## Extra: Auto-download script (optional)

I can add a small Node or PowerShell script that downloads the models into `client/public/models`. Tell me if you want that and which platform you use.

---

If you want, I can also:
- Add this doc to the repo (done).
- Add the auto-download script to `scripts/` and a small README note.
- Add example server-side matching code.

Which of the above would you like next?