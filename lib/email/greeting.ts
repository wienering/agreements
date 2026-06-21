type ClientGreetingFields = {
  emailGreetingName?: string | null;
  firstName: string;
};

export function getEmailGreeting(client: ClientGreetingFields): string {
  return client.emailGreetingName?.trim() || client.firstName;
}
