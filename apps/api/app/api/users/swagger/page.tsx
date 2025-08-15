'use client';

import { SwaggerUIComponent } from '../../../../components';
import { userSwaggerConfig } from '../../../../lib/swagger/users';

export default function UserSwaggerPage() {
  return (
    <SwaggerUIComponent
      spec={userSwaggerConfig}
      title="Rental Shop User Management API Documentation"
      description="Interactive documentation for all user management and authentication endpoints"
      docExpansion="list"
      tryItOutEnabled={true}
    />
  );
}
