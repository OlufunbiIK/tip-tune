import * as sanitizeHtml from 'sanitize-html';

export enum SanitiseMode {
  PLAIN = 'plain',
  RICH_TEXT = 'rich_text',
}

export const SANITISE_MODE_METADATA = 'tiptune:sanitise:mode';

export function SanitiseAsPlainText(): PropertyDecorator {
  return (target: object, propertyKey: string | symbol) => {
    Reflect.defineMetadata(
      SANITISE_MODE_METADATA,
      SanitiseMode.PLAIN,
      target,
      propertyKey,
    );
  };
}

export function SanitiseAsRichText(): PropertyDecorator {
  return (target: object, propertyKey: string | symbol) => {
    Reflect.defineMetadata(
      SANITISE_MODE_METADATA,
      SanitiseMode.RICH_TEXT,
      target,
      propertyKey,
    );
  };
}

export function sanitisePlainText(value: string): string {
  return sanitizeHtml(value, {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: 'discard',
  });
}

export function sanitiseRichText(value: string): string {
  return sanitizeHtml(value, {
    allowedTags: ['b', 'strong', 'i', 'em', 'a'],
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    disallowedTagsMode: 'discard',
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', {
        rel: 'noopener noreferrer nofollow',
      }),
    },
  });
}
