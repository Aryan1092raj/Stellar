import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import { config } from '../config/env';

const PINATA_BASE_URL = 'https://api.pinata.cloud';

function getPinataConfig() {
  const apiKey = config.PINATA_API_KEY || config.IPFS_PINATA_API_KEY;
  const secretKey = config.PINATA_SECRET_KEY || config.IPFS_PINATA_SECRET;

  if (!apiKey || !secretKey) {
    throw new Error('Pinata not configured. Set PINATA_API_KEY and PINATA_SECRET_KEY');
  }

  return { apiKey, secretKey };
}

export async function uploadFileToIPFS(filePath: string, originalName: string) {
  const { apiKey, secretKey } = getPinataConfig();
  const formData = new FormData();
  formData.append('file', fs.createReadStream(filePath));
  formData.append(
    'pinataMetadata',
    JSON.stringify({
      name: originalName,
      keyvalues: {
        uploadedAt: new Date().toISOString(),
        type: 'evidence',
      },
    })
  );
  formData.append('pinataOptions', JSON.stringify({ cidVersion: 1 }));

  const response = await axios.post(`${PINATA_BASE_URL}/pinning/pinFileToIPFS`, formData, {
    maxBodyLength: Infinity,
    headers: {
      'Content-Type': `multipart/form-data; boundary=${formData.getBoundary()}`,
      pinata_api_key: apiKey,
      pinata_secret_api_key: secretKey,
    },
  });

  return String(response.data.IpfsHash);
}

export async function checkIPFSHealth() {
  const { apiKey, secretKey } = getPinataConfig();
  await axios.get(`${PINATA_BASE_URL}/data/testAuthentication`, {
    headers: {
      pinata_api_key: apiKey,
      pinata_secret_api_key: secretKey,
    },
  });
}

export function toIPFSUrl(cid: string) {
  return `https://gateway.pinata.cloud/ipfs/${cid}`;
}
