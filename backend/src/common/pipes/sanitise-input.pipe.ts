import {
  ArgumentMetadata,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import {
  SANITISE_MODE_METADATA,
  SanitiseMode,
  sanitisePlainText,
  sanitiseRichText,
} from '../utils/sanitise.util';

const RICH_TEXT_FIELD_NAMES = new Set(['bio', 'description']);

@Injectable()
export class SanitiseInputPipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    if (value === null || value === undefined) {
      return value;
    }

    return this.sanitiseValue(value, metadata.metatype);
  }

  private sanitiseValue(
    value: unknown,
    metatype?: Function,
    propertyName?: string,
  ): unknown {
    if (typeof value === 'string') {
      const mode = this.resolveMode(metatype, propertyName);
      return mode === SanitiseMode.RICH_TEXT
        ? sanitiseRichText(value)
        : sanitisePlainText(value);
    }

    if (Array.isArray(value)) {
      return value.map((entry) => this.sanitiseValue(entry, metatype, propertyName));
    }

    if (typeof value === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
        const nestedMetatype = this.getNestedMetatype(metatype, key);
        result[key] = this.sanitiseValue(entry, nestedMetatype, key);
      }
      return result;
    }

    return value;
  }

  private resolveMode(
    metatype?: Function,
    propertyName?: string,
  ): SanitiseMode {
    if (metatype?.prototype && propertyName) {
      const explicitMode = Reflect.getMetadata(
        SANITISE_MODE_METADATA,
        metatype.prototype,
        propertyName,
      ) as SanitiseMode | undefined;

      if (explicitMode) {
        return explicitMode;
      }
    }

    if (propertyName && RICH_TEXT_FIELD_NAMES.has(propertyName)) {
      return SanitiseMode.RICH_TEXT;
    }

    return SanitiseMode.PLAIN;
  }

  private getNestedMetatype(
    metatype: Function | undefined,
    propertyName: string,
  ): Function | undefined {
    if (!metatype?.prototype) {
      return undefined;
    }

    const designType = Reflect.getMetadata(
      'design:type',
      metatype.prototype,
      propertyName,
    ) as Function | undefined;

    if (
      !designType ||
      designType === String ||
      designType === Number ||
      designType === Boolean ||
      designType === Date ||
      designType === Array ||
      designType === Object
    ) {
      return undefined;
    }

    return designType;
  }
}
