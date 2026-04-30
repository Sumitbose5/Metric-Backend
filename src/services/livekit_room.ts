import { AccessToken, AgentDispatchClient } from 'livekit-server-sdk';

export async function createLiveKitToken(identity: string, roomName: string, interviewId: string, userId: string) {
  const apiKey = process.env.LIVEKIT_API_KEY!;
  const apiSecret = process.env.LIVEKIT_API_SECRET!;
  const livekitUrl = process.env.LIVEKIT_URL!; // You need the URL here!

  // 1. Create the Token
  const at = new AccessToken(apiKey, apiSecret, {
    identity,
    metadata: JSON.stringify({ interviewId, userId })
  });

  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
  });

  // 2. Instantiate the Dispatch Client
  // 1. Instantiate the client
  const dispatchClient = new AgentDispatchClient(
    process.env.LIVEKIT_URL!,
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!
  );

  // 2. Use createDispatch instead of dispatch
  await dispatchClient.createDispatch(roomName, "Aria", {
    metadata: JSON.stringify({
      interviewId,
      userId
    })
  });

  return at.toJwt();
}