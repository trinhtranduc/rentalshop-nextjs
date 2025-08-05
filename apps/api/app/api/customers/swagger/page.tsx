import { SwaggerUIComponent } from '../../../../components';
import { customerSwaggerConfig } from '../../../../lib/swagger/customers';

export default function CustomerSwaggerPage() {
  return (
    <SwaggerUIComponent
      spec={customerSwaggerConfig}
      title="Rental Shop Customer API Documentation"
      description="Interactive documentation for all customer-related endpoints"
    />
  );
} 