import type { Client, SendableChannels } from "discord.js";

export let client: Client<true>;

export let errorChannel: SendableChannels | null;

export function setClient(newClient: Client<true>): void {
	client = newClient;
}

export function setErrorChannel(newErrorChannel: SendableChannels | null): void {
	errorChannel = newErrorChannel;
}
