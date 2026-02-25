import { sanitisePlainText, sanitiseRichText } from './sanitise.util';

describe('sanitise.util', () => {
  it('strips all HTML from plain text', () => {
    const input = `<script>alert('xss')</script><b>Hello</b> <img src=x onerror=alert(1) />`;
    const output = sanitisePlainText(input);
    expect(output).toBe(`Hello `);
  });

  it('allows limited rich text tags and safe links', () => {
    const input =
      `<b>Bold</b> <i>Italic</i> <a href="https://example.com" onclick="evil()">Link</a><script>boom()</script>`;
    const output = sanitiseRichText(input);
    expect(output).toContain('<b>Bold</b>');
    expect(output).toContain('<i>Italic</i>');
    expect(output).toContain('<a href="https://example.com"');
    expect(output).not.toContain('onclick');
    expect(output).not.toContain('<script>');
  });
});
