import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

export function useClientId() {
  const [clientId, setClientId] = useState<string>(() => uuidv4());

  const resetClientId = () => {
    setClientId(uuidv4());
  };

  return { clientId, resetClientId };
}
