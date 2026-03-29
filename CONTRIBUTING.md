# Contributing to TipTune 🎵

First off, thank you for considering contributing to TipTune! It's people like you that make TipTune such a great platform for artists and music lovers.

## 🌟 Ways to Contribute

There are many ways to contribute to TipTune:

- 🐛 **Bug Reports** - Help us identify and fix issues
- ✨ **Feature Requests** - Suggest new ideas and improvements
- 💻 **Code Contributions** - Submit pull requests for fixes or features
- 📚 **Documentation** - Improve guides, tutorials, and API docs
- 🎨 **Design** - Enhance UI/UX and create assets
- 🧪 **Testing** - Write tests and help with quality assurance
- 🌍 **Translations** - Help make TipTune accessible worldwide

---

## 💰 Drips Wave Program

TipTune is part of the **Stellar Drips Wave Program**! This means you can earn rewards for contributing:

- Browse issues tagged with `drips-wave` or `stellar-wave`
- Apply to work on an issue through the [Drips Wave platform](https://www.drips.network/wave)
- Complete the work and submit a PR
- Earn rewards when maintainers mark the issue as resolved

**Important Notes:**
- Only apply through the Drips Wave platform to be eligible for rewards
- Issues must be tagged with the active Wave program name
- Read the full [Drips Wave Terms](https://docs.drips.network/wave/terms-and-rules)
- Maintainers have final say on whether work resolves the issue

---

## 🚀 Getting Started

### 1. Fork and Clone

```bash
# Fork the repository on GitHub, then:
git clone https://github.com/YOUR_USERNAME/tiptune.git
cd tiptune

# Add upstream remote
git remote add upstream https://github.com/ORIGINAL_OWNER/tiptune.git
```

### 2. Set Up Your Environment

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Configure your .env with:
# - STELLAR_NETWORK=testnet (use testnet for development)
# - DATABASE_URL=your_postgres_connection
# - Other required variables

# Run database migrations
npm run migrate

# Start development server
npm run dev
```

### 3. Create a Branch

```bash
# Create a feature branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/bug-description
```

**Branch Naming Convention:**
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Adding tests
- `chore/` - Maintenance tasks

---

## 📋 Before You Start Coding

### Find or Create an Issue

- Check [existing issues](https://github.com/yourusername/tiptune/issues) to avoid duplication
- For bugs, search closed issues - it might already be fixed
- For new features, open an issue to discuss before implementing
- Comment on an issue to express interest or ask questions

### Good First Issues

Look for issues tagged with:
- `good-first-issue` - Great for newcomers
- `help-wanted` - We need community help
- `documentation` - Improve docs
- `drips-wave` - Eligible for Wave rewards

### Issue Application (for Drips Wave)

If you're applying through Drips Wave:
1. Apply via the Drips Wave platform (not just GitHub comments)
2. Wait for maintainer approval before starting work
3. Only one contributor per issue
4. Respect the assignment - don't work on issues assigned to others

---

## 💻 Development Guidelines

### Code Style

We use automated tools to maintain code quality:

```bash
# Format code
npm run format

# Run linter
npm run lint

# Type check
npm run type-check
```

**Standards:**
- Use TypeScript for type safety
- Follow existing code patterns
- Write meaningful variable names
- Keep functions small and focused
- Add comments for complex logic

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
type(scope): subject

[optional body]

[optional footer]
```

**Types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

**Examples:**
```bash
feat(player): add volume control slider

fix(wallet): resolve connection timeout issue

docs(readme): update installation instructions

test(tips): add unit tests for tip calculation
```

### Testing

All code contributions should include tests:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

**Test Guidelines:**
- Write unit tests for new functions and components
- Add integration tests for API endpoints
- Test edge cases and error conditions
- Aim for >80% code coverage on new code

### Stellar Integration

When working with Stellar:

- **Use Testnet** for development (never use mainnet keys in code)
- **Test thoroughly** - blockchain transactions are irreversible
- **Handle errors** - Network issues, insufficient balance, etc.
- **Document** - Explain Stellar-specific logic clearly

```typescript
// Good: Proper error handling
try {
  const transaction = await sendTip(artistId, amount);
  return { success: true, txHash: transaction.hash };
} catch (error) {
  if (error.code === 'INSUFFICIENT_BALANCE') {
    return { success: false, error: 'Not enough XLM' };
  }
  throw error;
}
```

---

## 🔄 Pull Request Process

### 1. Ensure Quality

Before submitting:

- ✅ Code follows style guidelines
- ✅ All tests pass
- ✅ New tests added for new features
- ✅ Documentation updated
- ✅ No console.logs or debugging code
- ✅ Commits are clean and well-formatted

### 2. Submit Pull Request

```bash
# Update your fork
git fetch upstream
git rebase upstream/main

# Push your changes
git push origin feature/your-feature-name
```

**PR Title Format:**
```
[Type] Brief description (#issue-number)
```

Examples:
- `[Feature] Add playlist creation functionality (#42)`
- `[Fix] Resolve wallet connection timeout (#89)`
- `[Docs] Update API documentation (#15)`

### 3. PR Description Template

```markdown
## Description
Brief description of changes

## Related Issue
Closes #123

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
Describe how you tested your changes

## Screenshots (if applicable)
Add screenshots for UI changes

## Checklist
- [ ] My code follows the project style guidelines
- [ ] I have performed a self-review
- [ ] I have commented complex code
- [ ] I have updated the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests
- [ ] All new and existing tests pass
```

### 4. Review Process

- Maintainers will review your PR within 3-5 business days
- Address feedback by pushing new commits
- Don't force-push after review has started
- Be patient and respectful
- Once approved, maintainers will merge

### 5. After Merge

```bash
# Update your local repository
git checkout main
git pull upstream main

# Delete your feature branch
git branch -d feature/your-feature-name
git push origin --delete feature/your-feature-name
```

---

## 🐛 Reporting Bugs

### Before Reporting

- Check [existing issues](https://github.com/yourusername/tiptune/issues)
- Try the latest version
- Search Discord/community channels

### Bug Report Template

```markdown
**Describe the bug**
Clear description of what the bug is

**To Reproduce**
Steps to reproduce:
1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior**
What you expected to happen

**Screenshots**
If applicable

**Environment:**
- OS: [e.g. macOS, Windows, Linux]
- Browser: [e.g. Chrome 120, Firefox 121]
- TipTune version: [e.g. 1.2.0]
- Wallet: [e.g. Freighter 5.0.0]

**Additional context**
Any other relevant information
```

---

## ✨ Suggesting Features

### Before Suggesting

- Check if the feature already exists
- Review open feature requests
- Consider if it fits TipTune's scope

### Feature Request Template

```markdown
**Is your feature request related to a problem?**
Clear description of the problem

**Describe the solution you'd like**
What you want to happen

**Describe alternatives you've considered**
Other solutions you've thought about

**Additional context**
Mockups, examples, or references

**Would you like to implement this?**
Are you willing to contribute code?
```

---

## 📚 Documentation Contributions

Documentation is just as important as code!

### What to Document

- API endpoints and usage
- Component props and behavior
- Setup and configuration
- Common issues and solutions
- Stellar integration patterns

### Documentation Standards

- Use clear, simple language
- Include code examples
- Add screenshots for UI features
- Keep it up-to-date with code changes
- Use proper markdown formatting

---

## 🎨 Design Contributions

### UI/UX Improvements

- Follow existing design patterns
- Ensure responsive design (mobile-first)
- Maintain accessibility standards (WCAG 2.1 AA)
- Test on multiple devices and browsers

### Design Assets

- Use SVG for icons when possible
- Optimize images (WebP format preferred)
- Follow color palette in design system
- Provide assets in multiple sizes

---

## 🌍 Translation Contributions

Help make TipTune accessible globally:

1. Check `src/locales/` for existing translations
2. Copy `en.json` as template
3. Translate all strings
4. Test in the app
5. Submit PR with new locale file

**Translation Guidelines:**
- Maintain tone and context
- Keep string keys unchanged
- Test UI with longer translations
- Include RTL support if applicable

---

## ⚖️ Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inspiring community for all.

### Our Standards

**Positive behavior:**
- Using welcoming and inclusive language
- Being respectful of differing viewpoints
- Gracefully accepting constructive criticism
- Focusing on what's best for the community
- Showing empathy towards others

**Unacceptable behavior:**
- Harassment or discriminatory language
- Trolling, insulting, or derogatory comments
- Public or private harassment
- Publishing others' private information
- Other unprofessional conduct

### Enforcement

Violations can be reported to maintainers. All complaints will be reviewed and investigated promptly and fairly.

----

## 🙋 Getting Help

**Stuck? Need clarification?**

- 💬 [Join our Discord](https://discord.gg/tiptune)
- 📧 Email: dev@tiptune.io
- 🐦 Twitter: [@TipTuneMusic](https://twitter.com/tiptunemusic)
- 📖 [Documentation](https://docs.tiptune.io)

**For Drips Wave specific questions:**
- Visit [Drips Wave Support](https://www.drips.network/wave/support)
- Read [Wave Documentation](https://docs.drips.network/wave)

---

## 🏆 Recognition

Contributors will be:
- Listed in our [CONTRIBUTORS.md](CONTRIBUTORS.md) file
- Mentioned in release notes
- Featured in community spotlights
- Eligible for special contributor roles in Discord

**Top Contributors** get:
- Early access to new features
- Input on roadmap decisions
- Exclusive TipTune swag
- Recognition on our website

---

## 📜 License

By contributing to TipTune, you agree that your contributions will be licensed under the MIT License.

---

## 🎵 Final Notes

- **Quality over quantity** - We prefer well-tested, documented PRs
- **Communication is key** - Ask questions, discuss approaches
- **Be patient** - Maintainers are often volunteers
- **Have fun** - We're building something awesome together!

**Thank you for contributing to TipTune! Together, we're revolutionizing how artists get paid. 🚀**

---

*Last updated: January 2026*
