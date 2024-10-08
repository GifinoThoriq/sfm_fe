import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { NzTableModule } from 'ng-zorro-antd/table';
import { NzDividerModule } from 'ng-zorro-antd/divider'
import { TableUserComponent } from './table-user.component';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
 
@NgModule({
  declarations: [TableUserComponent],
  imports: [
    CommonModule,
    NzTableModule,
    NzDividerModule,
    NzBadgeModule,
    NzButtonModule,
    NzIconModule,
    NzTagModule,
    NzPaginationModule
  ],
  exports: [TableUserComponent]
})
export class TableUserModule { }
