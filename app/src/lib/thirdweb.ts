import { createThirdwebClient } from "thirdweb";

const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;

// client is null if no clientId is set (auth UI will be hidden until configured)
export const client = clientId
  ? createThirdwebClient({ clientId })
  : null;
