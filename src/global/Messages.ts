export const Messages = {
    cannotJoinThisChannel: (channelId: string) => `I don't have permission to join <#${channelId}>`,
    notInVoice: () => `You must be in a voice channel to use this command`,
    timeout: (seconds: number, subject: string) => `Unable to ${subject} in reasonable time (${seconds} seconds)`,
};
