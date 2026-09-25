const HACKATHON =
  /\b(hackathon|hack[\s-]?(day|night|weekend|week|fest|house)|hacker[\s-]?house|hack|buildathon|build[\s-]?(day|night|weekend)|(ai|game|code|data)[\s-]?jam|datathon|codefest)s?\b/i;

/** Hands-on formats that count when a followed organiser runs them. */
const BUILD_SESSION =
  /\b(workshop|lock[\s-]?in|builders?|build|hands[\s-]?on|code[\s-]?along|live[\s-]?coding|demo[\s-]?(day|night)|showcase|bootcamp|sprint)s?\b/i;

const FALSE_POSITIVES = /\b(growth|life|bio|body|brain|career|travel)[\s-]?hack|\bwatch[\s-]?party\b/i;

export function isHackathon(title: string): boolean {
  return HACKATHON.test(title) && !FALSE_POSITIVES.test(title);
}

export function isBuildSession(title: string): boolean {
  return (HACKATHON.test(title) || BUILD_SESSION.test(title)) && !FALSE_POSITIVES.test(title);
}
