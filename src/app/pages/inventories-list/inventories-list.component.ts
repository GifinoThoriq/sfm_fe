import { Component, OnInit } from '@angular/core';
import { FormGroup, Validators, FormBuilder } from '@angular/forms';
import { NzModalService } from 'ng-zorro-antd/modal';
import { debounceTime, distinctUntilChanged, Observable, Subject, tap } from 'rxjs';
import { ApiService } from 'src/app/api.service';
import { AuthService } from 'src/app/auth.service';
import { ICategories, IDataCategories, IDataInventory, IRootInventory, IRootUnit } from 'src/app/interfaces';
import { SpinnerService } from 'src/app/spinner.service';

@Component({
  selector: 'app-inventories-list',
  templateUrl: './inventories-list.component.html',
  styleUrls: ['./inventories-list.component.scss']
})
export class InventoriesListComponent implements OnInit {
  inventory$!: Observable<IRootInventory>

  isVisibleEdit = false;
  isVisibleAdd = false;
  isVisibleDelete = false;
  isVisibleDetail = false;
  isVisibleFilter = false;

  modal_type = 'Add';

  totalInventories: number = 0;

  inventoryForm: FormGroup;

  selectedIdDelete: number = 0;

  searchEmp: string = '';

  status: number = 1;

  pic_id = localStorage.getItem('pic_id')!;

  pic$!: Observable<any>;

  listOfPic: any;
  filteredListOfPic: any;

  unit$!: Observable<IRootUnit>;

  unitList: IRootUnit = {} as IRootUnit

  formattedLabel: string = '';

  formattedValueCost: number | null = 0;

  formattedValueSelling: number | null = 0;

  supplier$!: Observable<any>;
  productCat$!: Observable<ICategories>;

  totalAll: number = 0;
  pageSize: number = 5;
  currentPage: number = 1;

  search: string = '';
  private searchSubject = new Subject<string>();

  dataDetail: IDataInventory = {} as IDataInventory;

  filterForm: FormGroup;

  filtered: boolean = false;

  constructor(
    private apiSvc: ApiService,
    private fb: FormBuilder,
    private spinnerSvc: SpinnerService,
    private modalSvc: NzModalService,
    public authSvc: AuthService
  ) { 
    this.inventoryForm = this.fb.group({
      id: [''],
      name: ['', Validators.required],
      code: ['', Validators.required],
      description: ['', Validators.required],
      unit_id: ['', Validators.required],
      product_cost: ['', Validators.required],
      selling_price: ['', Validators.required],
      qty: [{value: 0, disabled: true}],
      pic: [[this.pic_id], [Validators.required]],
      is_pic_internal: ['', [Validators.required]],
      supplier_id: ['', [Validators.required]],
      status: [1, [Validators.required]],
      supplier_product_id: ['', [Validators.required]]
    })

    this.filterForm = this.fb.group({
      status: [''],
      supplier_product: [''],
      sort_by: ['']
    })
   }

  ngOnInit(): void {

    this.inventoryForm.get('supplier_product_id')?.valueChanges.subscribe((value) => {
      this.supplier$ = this.apiSvc.getSupplierByProduct(value);
    })

    this.inventoryForm.get('status')?.valueChanges.subscribe((value: boolean) => {
      this.inventoryForm.get('status')?.setValue(value ? 1 : 0, { emitEvent: false });
    });

    this.productCat$ = this.apiSvc.getSupplierProduct();

    this.inventoryForm.get('unit_id')?.valueChanges.subscribe((value) => {

      if(value){
        const selectedUnit = this.unitList.data.filter(u => u.id === value);
        this.getFormattedLabel(selectedUnit[0].measurement, selectedUnit[0].unit)
      }

    })

    this.unit$ = this.apiSvc.getUnitMeasurement().pipe(
      tap(res => {
        this.unitList = res;
      })
    );
    
    this.inventoryForm.get('pic')?.valueChanges.subscribe((value) => {
      if(value){
        this.filteredListOfPic = this.listOfPic.filter((pic: any) => value.includes(pic.pic_id));

        if(!value.includes(this.inventoryForm.get('is_pic_internal')?.value)){
          this.inventoryForm.patchValue({is_pic_internal: ''})
        }
      }

    })


    this.pic$ = this.apiSvc.getPic().pipe(
      tap(res => {
        this.listOfPic = res;
        this.filteredListOfPic = res.filter((p: any) => p.pic_id === this.pic_id);
      })
    )

    this.getInventory();

    this.apiSvc.refreshGetInventory$.subscribe(() => {
      this.getInventory();
    })

    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(search => {
      this.inventory$ = this.apiSvc.searchInventory(search, this.currentPage, this.pageSize).pipe(
        tap(res => {
          this.totalInventories = res.data.length;
          this.currentPage = res.pagination.current_page;
          this.totalAll = res.pagination.total;
        })
      );
    });
  }

  refreshTable(): void{
    this.filtered = false;
    this.pageSize = 5;
    this.currentPage = 1;
    this.inventoryForm.reset();
    this.getInventory();
  }

  submitFilter(): void{
    this.getFilteredInventory();
    this.isVisibleFilter=false;
  }

  getFilteredInventory(){
    this.inventory$ = this.apiSvc.filterInventory(this.filterForm.value, this.currentPage, this.pageSize).pipe(
      tap(res => {
        this.totalInventories = res.data.length;
        this.currentPage = res.pagination.current_page;
        this.totalAll = res.pagination.total
        this.filtered = true
      })
    )
  }

  showFilter(): void{
    this.isVisibleFilter = true;
  }

  handleCancelFilter(): void {
    this.isVisibleFilter = false;
  }

  searchHandler(search: string){
    this.searchSubject.next(search);
  }

  handleCancelDetail(): void {
    this.isVisibleDetail = false;
  }

  showModalDetail(data: IDataInventory){
    this.dataDetail = data;

    this.isVisibleDetail = true;
  }


  pageIndexChange(page: number){
    this.currentPage = page;

    if(this.filtered){
      this.getFilteredInventory();
    } else {
      this.getInventory();
    }

  }

  formatter = (value: number | null): string => {
    return value !== null ? `${value.toLocaleString('en-US')}` : '';
  };

  updateFormattedValueSelling(value: number | null): void{
    this.formattedValueSelling = value;
  }

  updateFormattedValue(value: number | null): void {
    this.formattedValueCost = value;
  }

  getFormattedLabel(measurement: string, unit: string): void {

    if(unit){
      this.formattedLabel = `${measurement}<sup>${unit}</sup>`;
      return;
    }

    this.formattedLabel =  `${measurement}`;
  }

  getInventory(): void{
    this.inventory$ = this.apiSvc.getInventory(this.currentPage, this.pageSize).pipe(
      tap(res => {
        this.totalInventories = res.data.length;
        this.currentPage = res.pagination.current_page;
        this.totalAll = res.pagination.total
      })
    );
  }

  showModalEdit(data: IDataInventory): void {
    this.modal_type = 'Edit'

    this.inventoryForm.patchValue({
      id: data.id,
      name: data.name,
      code: data.code,
      description: data.description,
      unit_id: data.unit_id,
      product_cost: data.product_cost,
      selling_price: data.selling_price,
      qty: data.qty,
      supplier_product_id: data.supplier_product_id,
      supplier_id: data.supplier_id,
      status:data.status
    })

    //extract pic id
    const picIds = data.pic.map(item => item.pic_id);

    //find pic internal id
    const isPicInternalId = data.pic.filter(item => item.is_pic_internal === 1);

    this.inventoryForm.patchValue({
      pic: picIds,
      is_pic_internal: isPicInternalId[0].pic_id
    });

    this.isVisibleEdit = true;
  }

  showModalAdd(): void {
    this.modal_type = 'Add'
    this.isVisibleAdd = true;
  }

  showModalDelete(id: string): void{
    this.selectedIdDelete = parseInt(id);
    this.isVisibleDelete = true;
  }

  handleSubmitEdit(): void {

    this.spinnerSvc.show();
    
    if(this.inventoryForm.valid){
      const picComplete = this.inventoryForm.get('pic')!.value.map((pic_id: any) => ({
        pic_id: pic_id,
        is_pic_internal: pic_id === this.inventoryForm.get('is_pic_internal')!.value ? 1 : 0
      }));
  

      let body = {
        id: this.inventoryForm.get('id')?.value,
        name: this.inventoryForm.get('name')?.value,
        code: this.inventoryForm.get('code')?.value,
        description: this.inventoryForm.get('description')?.value,
        unit_id: this.inventoryForm.get('unit_id')?.value,
        supplier_product_id: this.inventoryForm.get('supplier_product_id')?.value,
        supplier_id: this.inventoryForm.get('supplier_id')?.value,
        product_cost: this.inventoryForm.get('product_cost')?.value,
        selling_price: this.inventoryForm.get('selling_price')?.value,
        status: this.inventoryForm.get('status')?.value,
        pic_new: picComplete
      }

      this.apiSvc.updateInventory(body).subscribe({
        next: () => {
          this.spinnerSvc.hide();
          this.modalSvc.success({
            nzTitle: 'Success',
            nzContent: 'Successfully Update Inventory',
            nzOkText: 'Ok',
            nzCentered: true
          })
          this.apiSvc.triggerRefreshInventory()
        },
        error: (error) => {
          this.spinnerSvc.hide();
          this.modalSvc.error({
            nzTitle: 'Unable to Update Inventory',
            nzContent: error.error.meta.message,
            nzOkText: 'Ok',
            nzCentered: true
          })
        },
        complete: () => {
          this.isVisibleEdit = false;
        }
      })
    } else {
      this.spinnerSvc.hide();
      this.modalSvc.error({
        nzTitle: 'Unable to Update',
        nzContent: 'Need to fill all input',
        nzOkText: 'Ok',
        nzCentered: true
      })
    }
  }

  handleSubmitAdd(): void{

    this.spinnerSvc.show();

    if(this.inventoryForm.valid){

      const picComplete = this.inventoryForm.get('pic')!.value.map((pic_id: any) => ({
        pic_id: pic_id,
        is_pic_internal: pic_id === this.inventoryForm.get('is_pic_internal')!.value ? 1 : 0
      }));
  

      let body = {
        name: this.inventoryForm.get('name')?.value,
        code: this.inventoryForm.get('code')?.value,
        description: this.inventoryForm.get('description')?.value,
        unit_id: this.inventoryForm.get('unit_id')?.value,
        supplier_product_id: this.inventoryForm.get('supplier_product_id')?.value,
        supplier_id: this.inventoryForm.get('supplier_id')?.value,
        product_cost: this.inventoryForm.get('product_cost')?.value,
        selling_price: this.inventoryForm.get('selling_price')?.value,
        status: this.inventoryForm.get('status')?.value,
        pic: picComplete
      }

      this.apiSvc.createInventory(body).subscribe({
        next: () => {

          this.spinnerSvc.hide();
          this.modalSvc.success({
            nzTitle: 'Success',
            nzContent: 'Successfully Add Inventory',
            nzOkText: 'Ok',
            nzCentered: true
          })
          this.apiSvc.triggerRefreshInventory()
          this.isVisibleAdd = false;
        },
        error: (error) => {
          this.spinnerSvc.hide();
          this.modalSvc.error({
            nzTitle: 'Unable to Add Inventory',
            nzContent: error.error.meta.message,
            nzOkText: 'Ok',
            nzCentered: true
          })
        },
        complete: () => {
          this.inventoryForm.reset();
        }
      })
    } else {
      this.spinnerSvc.hide();
      this.modalSvc.error({
        nzTitle: 'Unable to Add',
        nzContent: 'Need to fill all input',
        nzOkText: 'Ok',
        nzCentered: true
      })      
    }
  }

  handleSubmitDelete(): void{

    this.apiSvc.deleteContactType(this.selectedIdDelete).subscribe({
      next:() => {

        this.spinnerSvc.hide();
        this.modalSvc.success({
          nzTitle: 'Success',
          nzContent: 'Successfully Delete Category',
          nzOkText: 'Ok',
          nzCentered: true
        })


        this.apiSvc.triggerRefreshCategories();
        this.isVisibleDelete = false;
      },
      error:(error) => {
        this.spinnerSvc.hide();

        this.modalSvc.error({
          nzTitle: 'Unable to Delete',
          nzContent: error.error.meta.message,
          nzOkText: 'Ok',
          nzCentered: true
        })
      }
    })
  }

  handleCancelEdit(): void {
    this.isVisibleEdit = false;
  }

  handleCancelAdd(): void{
    this.isVisibleAdd = false;
    this.inventoryForm.reset();
  }

  handleCancelDelete(): void{
    this.isVisibleDelete = false;
  }
}
