import type { Tool, SerialNumbers } from "../types";

export const isSerialNumbersObject = (serials: any): serials is SerialNumbers => {
  return serials && typeof serials === 'object' && !Array.isArray(serials);
};

// ✅ FIXED: Returns ALL 4 serials in serialSet
export const extractAllSerialsFromTool = (
  tool: Tool,
  expectedEquipmentType?: string
): { serialSet: string[]; dataloggerSerial?: string; externalRadioSerial?: string } => {
  
  const serialSet: string[] = [];
  let dataloggerSerial: string | undefined;
  let externalRadioSerial: string | undefined;

  console.log("Extracting serials from tool:", tool.serials, "expected:", expectedEquipmentType);

  // --- 1. HANDLE ARRAY FORMAT ---
  if (Array.isArray(tool.serials)) {
    const allSerials = tool.serials as string[];

    // ✅ NEW APPROACH: For Base & Rover Combo, keep ALL 4 serials together
    if (expectedEquipmentType === "Base & Rover Combo") {
      // Put ALL serials in serialSet (including DL and Radio)
      serialSet.push(...allSerials);
      
      // Also extract DL and Radio separately for identification purposes
      dataloggerSerial = allSerials.find(s => 
        s.toUpperCase().includes('DL-') || 
        s.toUpperCase().includes('DATALOGGER')
      );
      
      externalRadioSerial = allSerials.find(s => 
        s.toUpperCase().includes('ER-') || 
        s.toUpperCase().includes('RADIO') ||
        s.toUpperCase().includes('EXTERNAL')
      );
      
      // Fallback: If we didn't find by pattern, assume order
      if (!dataloggerSerial && allSerials.length >= 3) {
        dataloggerSerial = allSerials[2];
      }
      if (!externalRadioSerial && allSerials.length >= 4) {
        externalRadioSerial = allSerials[3];
      }
    } 
    else if (expectedEquipmentType === "Base Only" || expectedEquipmentType === "Rover Only") {
      // For single units, keep all serials (typically 2: receiver + DL)
      serialSet.push(...allSerials);
      
      // Try to identify DL
      dataloggerSerial = allSerials.find(s => 
        s.toUpperCase().includes('DL-') || 
        s.toUpperCase().includes('DATALOGGER')
      );
      
      // Fallback if no DL pattern found
      if (!dataloggerSerial && allSerials.length >= 2) {
        dataloggerSerial = allSerials[1];
      }
    }
    else {
      // Default: Keep all serials
      serialSet.push(...allSerials);
    }
  }

  // --- 2. HANDLE OBJECT FORMAT ---
  else if (tool.serials && typeof tool.serials === 'object') {
    const serialObj = tool.serials as any;

    // Helper to grab common keys
    const getVal = (...keys: string[]) => {
      for (const k of keys) {
        if (serialObj[k]) return serialObj[k];
      }
      return undefined;
    };

    // Extract Known Parts
    dataloggerSerial = getVal('data_logger', 'datalogger', 'dl');
    externalRadioSerial = getVal('external_radio', 'radio', 'externalRadio', 'er');

    if (expectedEquipmentType === "Base & Rover Combo") {
      // Add receivers
      if (serialObj.receiver1) serialSet.push(serialObj.receiver1);
      if (serialObj.receiver2) serialSet.push(serialObj.receiver2);
      
      // Add DL
      if (dataloggerSerial) serialSet.push(dataloggerSerial);
      
      // Add Radio
      if (externalRadioSerial) serialSet.push(externalRadioSerial);

      // If no numbered keys, try splitting the main 'receiver' key
      if (serialSet.length === 0 && serialObj.receiver) {
        const parts = serialObj.receiver.split(',').map((s: string) => s.trim());
        serialSet.push(...parts); 
      }
    } 
    else {
      // Base Only, Rover Only, or Generic
      if (serialObj.receiver) serialSet.push(serialObj.receiver);
      if (serialObj.receiver1) serialSet.push(serialObj.receiver1);
      if (dataloggerSerial) serialSet.push(dataloggerSerial);
    }
  }

  console.log("Final extracted:", { serialSet, dataloggerSerial, externalRadioSerial });
  return { serialSet, dataloggerSerial, externalRadioSerial };
};

const getSerialValue = (serials: any, key: string): string => {
  if (!serials) return '';
  if (isSerialNumbersObject(serials)) return serials[key] || '';
  // Simple array fallback logic for display helpers
  if (Array.isArray(serials)) {
    if (key === 'receiver1') return serials[0] || '';
    if (key === 'receiver2') return serials[1] || '';
  }
  return '';
};

export { getSerialValue };