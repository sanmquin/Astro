import React, { useState } from 'react';
import type { AgentSettings } from '../types';
import { loadSettings, saveSettings } from '../utils/storage';
import { Settings as SettingsIcon, X } from 'lucide-react';

interface SettingsProps {
  onClose: () => void;
  onSettingsChange: (settings: AgentSettings) => void;
}

const Settings: React.FC<SettingsProps> = ({ onClose, onSettingsChange }) => {
  const [settings, setLocalSettings] = useState<AgentSettings>(loadSettings());

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;

    const updated = {
      ...settings,
      [name]: newValue,
    };
    setLocalSettings(updated);
  };

  const handleSave = () => {
    saveSettings(settings);
    onSettingsChange(settings);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <SettingsIcon size={20} /> Settings
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Gemini API Key
            </label>
            <input
              type="password"
              name="geminiApiKey"
              value={settings.geminiApiKey}
              onChange={handleChange}
              className="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter Gemini API Key"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Listening Time (seconds)
            </label>
            <input
              type="number"
              name="maxListeningTime"
              value={settings.maxListeningTime}
              onChange={handleChange}
              className="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="120"
              min="10"
              max="600"
            />
          </div>

          <div className="pt-4 border-t">
            <div className="flex items-center mb-4">
              <input
                type="checkbox"
                id="useElevenLabs"
                name="useElevenLabs"
                checked={settings.useElevenLabs}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="useElevenLabs" className="ml-2 block text-sm font-medium text-gray-700">
                Use Eleven Labs for TTS
              </label>
            </div>

            {settings.useElevenLabs && (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Eleven Labs API Key
                  </label>
                  <input
                    type="password"
                    name="elevenLabsApiKey"
                    value={settings.elevenLabsApiKey}
                    onChange={handleChange}
                    className="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter Eleven Labs API Key"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Eleven Labs Voice ID
                  </label>
                  <input
                    type="text"
                    name="elevenLabsVoiceId"
                    value={settings.elevenLabsVoiceId}
                    onChange={handleChange}
                    className="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter Voice ID"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        <div className="p-4 bg-gray-50 border-t flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
