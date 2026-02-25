import { ArgumentMetadata } from '@nestjs/common';
import { SanitiseInputPipe } from './sanitise-input.pipe';
import {
  SanitiseAsPlainText,
  SanitiseAsRichText,
} from '../utils/sanitise.util';

class SanitisePipeDto {
  @SanitiseAsPlainText()
  username!: string;

  @SanitiseAsRichText()
  bio!: string;

  description!: string;

  nested!: {
    content: string;
  };
}

describe('SanitiseInputPipe', () => {
  const pipe = new SanitiseInputPipe();

  it('sanitises plain text fields and keeps safe subset for rich fields', () => {
    const payload: SanitisePipeDto = {
      username: `<img src=x onerror=alert(1)>user`,
      bio: `<b>Artist</b> <script>alert(1)</script>`,
      description: `<i>Cool</i> <a href="javascript:alert(1)">bad</a>`,
      nested: {
        content: `<svg onload=alert(1)>ok</svg>`,
      },
    };

    const metadata: ArgumentMetadata = {
      type: 'body',
      metatype: SanitisePipeDto,
      data: '',
    };

    const result = pipe.transform(payload, metadata) as SanitisePipeDto;

    expect(result.username).toBe('user');
    expect(result.bio).toContain('<b>Artist</b>');
    expect(result.bio).not.toContain('<script>');
    expect(result.description).toContain('<i>Cool</i>');
    expect(result.description).not.toContain('javascript:');
    expect(result.nested.content).toBe('ok');
  });
});
