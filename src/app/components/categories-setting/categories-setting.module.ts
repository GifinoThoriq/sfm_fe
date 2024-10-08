import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoyalCustomerComponent } from './loyal-customer/loyal-customer.component';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { EditCategoriesModalComponent } from './edit-categories-modal/edit-categories-modal.component';
import { ReactiveFormsModule } from '@angular/forms';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { DeleteCategoriesModalComponent } from './delete-categories-modal/delete-categories-modal.component';
import { NzResultModule } from 'ng-zorro-antd/result';
import { CustomerSectorComponent } from './customer-sector/customer-sector.component';
import { CustomerFirmComponent } from './customer-firm/customer-firm.component';
import { SupplierProductComponent } from './supplier-product/supplier-product.component';
import { SupplierSourceComponent } from './supplier-source/supplier-source.component';
import { ContactTypeComponent } from './contact-type/contact-type.component';
import { EmployeeContractComponent } from './employee-contract/employee-contract.component';
import { UnitOfMeasurementComponent } from './unit-of-measurement/unit-of-measurement.component';
import { WarehouseAddressComponent } from './warehouse-address/warehouse-address.component';
import { AddWarehouseAddressComponent } from './add-warehouse-address/add-warehouse-address.component';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { BillingAddressComponent } from './billing-address/billing-address.component';


@NgModule({
  declarations: [
    LoyalCustomerComponent,
    EditCategoriesModalComponent,
    DeleteCategoriesModalComponent,
    CustomerSectorComponent,
    CustomerFirmComponent,
    SupplierProductComponent,
    SupplierSourceComponent,
    ContactTypeComponent,
    EmployeeContractComponent,
    UnitOfMeasurementComponent,
    WarehouseAddressComponent,
    AddWarehouseAddressComponent,
    BillingAddressComponent
  ],
  imports: [
    CommonModule,
    NzTableModule,
    NzDividerModule,
    NzIconModule,
    NzModalModule,
    ReactiveFormsModule,
    NzFormModule,
    NzInputModule,
    NzButtonModule,
    NzResultModule,
    NzSelectModule
  ],
  exports: [
    LoyalCustomerComponent,
    EditCategoriesModalComponent,
    DeleteCategoriesModalComponent,
    CustomerSectorComponent,
    CustomerFirmComponent,
    SupplierProductComponent,
    SupplierSourceComponent,
    ContactTypeComponent,
    EmployeeContractComponent,
    UnitOfMeasurementComponent,
    WarehouseAddressComponent,
    AddWarehouseAddressComponent,
    BillingAddressComponent
  ]
})
export class CategoriesSettingTableModule { }
