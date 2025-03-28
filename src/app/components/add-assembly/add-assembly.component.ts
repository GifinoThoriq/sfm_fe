import { DatePipe } from '@angular/common';
import { Component, inject, Input, OnInit } from '@angular/core';
import { Validators, UntypedFormBuilder, UntypedFormGroup, UntypedFormArray } from '@angular/forms';
import { NZ_DRAWER_DATA, NzDrawerRef } from 'ng-zorro-antd/drawer';
import { NzModalRef, NzModalService } from 'ng-zorro-antd/modal';
import { Observable, tap, startWith, combineLatest } from 'rxjs';
import { ApiService } from 'src/app/api.service';
import { IDataAssembly, IDataPurchaseOrder, IRootInvenSupplier } from 'src/app/interfaces';
import { SpinnerService } from 'src/app/spinner.service';
import { EditCategoriesModalComponent } from '../categories-setting/edit-categories-modal/edit-categories-modal.component';

@Component({
  selector: 'app-add-assembly',
  templateUrl: './add-assembly.component.html',
  styleUrls: ['./add-assembly.component.scss']
})
export class AddAssemblyComponent implements OnInit {
  nzData = inject(NZ_DRAWER_DATA);
  modal_type: string = this.nzData.modal_type;
  dataDetail: IDataAssembly = this.nzData.dataDetail;
  inventoryList: any = this.nzData.inventoryList;
  assemblyList: any = this.nzData.assemblyList;

  pic$!: Observable<any>;

  listOfPic: any[] = [];
  filteredListOfPic: any[] = [];

  pic_id = localStorage.getItem('pic_id')!;

  assemblyForm = this.fb.group({
    id: [null],
    date: ['', Validators.required],
    no_ref: ['', Validators.required],
    description: ['', Validators.required],
    pic: [[this.pic_id], [Validators.required]],
    is_pic_internal: ['', [Validators.required]],
    status: [1, [Validators.required]],
    qty: [1, [Validators.required]],
    order: this.fb.array([]),
    order_additional: this.fb.array([])
  })



  totalOrder: number = 0;
  totalGrandOrder: number = 0;

  totalInventoryOrder: number = 0;
  totalInventoryOrderPerItem: number = 0;
  totalAdditionalOrder: number = 0;

  formDisable: boolean = false;

  provinces$!: Observable<any>;
  unit$!: Observable<any>;


  unitList: any[] = [];

  categoryFormUnit = this.fb.group({
    id: [''],
    name: ['', Validators.required],
    measurement: ['', Validators.required],
    unit: [''],
    description: ['', Validators.required]
  })

  ModalRefUnit?: NzModalRef;

  deletedOrderAdditional: string[] = [];

  constructor(
    private fb: UntypedFormBuilder,
    private apiSvc: ApiService,
    private drawerRef: NzDrawerRef,
    private datePipe: DatePipe,
    private spinnerSvc: SpinnerService,
    private modalSvc: NzModalService,
  ) { }

    ngOnInit(): void {
    // this.modal_type = this.nzModalData.modal_type;
    // this.dataDetail = this.nzModalData.dataDetail;
    // this.inventoryList = this.nzModalData.inventoryList;
    // this.assemblyList = this.nzModalData.assemblyList;
  

    this.assemblyForm.get('status')?.valueChanges.subscribe((value: boolean) => {
      this.assemblyForm.get('status')?.setValue(value ? 1 : 0, { emitEvent: false });
    });

    this.apiSvc.refreshGetCategories$.subscribe(() => {

      this.unit$ = this.apiSvc.getUnitMeasurement().pipe(
        tap(unit => {
          this.unitList = unit.data
        } )
      )
    })

    this.unit$ = this.apiSvc.getUnitMeasurement().pipe(
      tap(unit => {
        this.unitList = unit.data
      }
    ))
    

    //used for calculate total order and total grand order
    const orderChanges$ = this.order.valueChanges.pipe(startWith(this.order.value));
    const orderAdditionalChanges$ = this.orderAdditional.valueChanges.pipe(startWith(this.orderAdditional.value));
  
    combineLatest([orderChanges$,orderAdditionalChanges$]).subscribe(() => {
      // Recalculate the total order cost
      const totalSumOrder = this.calculateTotalCost();
      const totalSumAdditional = this.calculateTotalCostAdditional();

      this.totalInventoryOrder = totalSumOrder.total;
      this.totalInventoryOrderPerItem = totalSumOrder.totalEach;

      this.totalAdditionalOrder = totalSumAdditional;

      this.totalOrder = totalSumOrder.total + totalSumAdditional;
  
      this.totalGrandOrder = this.totalOrder;
    });


    this.assemblyForm.get('pic')?.valueChanges.subscribe((value) => {
      this.filteredListOfPic = this.listOfPic.filter(pic => value.includes(pic.pic_id));

      if(!value.includes(this.assemblyForm.get('is_pic_internal')?.value)){
        this.assemblyForm.patchValue({is_pic_internal: ''})
      }
    })



    this.assemblyForm.get('date')?.valueChanges.subscribe((value) => {
      const formattedDate = this.datePipe.transform(new Date(value), 'yyyy-MM-dd') || '';

      this.assemblyForm.patchValue({date: formattedDate})
    })


    this.pic$ = this.apiSvc.getPic().pipe(
      tap(res => {
        this.listOfPic = res;
        this.filteredListOfPic = this.listOfPic.filter(pic => this.pic_id.includes(pic.pic_id));
      })
    )

    this.addOrder();

    if(this.modal_type === 'edit' || this.modal_type === 'duplicate'){

      this.assemblyForm.patchValue({
        id: this.dataDetail.id,
        date: this.dataDetail.date,
        description: this.dataDetail.description,
        no_ref: this.dataDetail.no_ref,
        qty: this.dataDetail.qty
      })

      //update PIC
      this.pic$ = this.apiSvc.getPic().pipe(
        tap(res => {
          this.listOfPic = res;

          //extract pic id
          const picIds = this.dataDetail.pic.map(item => item.pic_id);

          //find pic internal id
          const isPicInternalId = this.dataDetail.pic.filter(item => item.is_pic_internal === 1);

          this.assemblyForm.patchValue({
            pic: picIds,
            is_pic_internal: isPicInternalId[0].pic_id,
          });
        })
      )
      
  
      //clear existing order
      while (this.order.length !== 0) {
        this.order.removeAt(0);
      }

      //update orders
      this.dataDetail.assembly_inventory_items.forEach((order, i) => {
        let updateOrder: any;
        if(order.type === 'inventory'){
          const product = this.inventoryList.data.find((p: any) => p.id === order.raw_material_inventory?.inventory.id);
          updateOrder = this.fb.group({
            type: [order.type],
            inventory_id: [order.raw_material_inventory?.inventory.id, Validators.required],
            inventory_items_id: [order.raw_material_inventory?.id],
            supplier: [order.raw_material_inventory?.id],
            suppliersList: [product.inventory_items],
            part_number: [order.raw_material_inventory?.inventory.id],
            product_code: [order.raw_material_inventory?.inventory.code],
            qty: [parseFloat(order.qty), Validators.required],
            unit_unit: [order.raw_material_inventory?.inventory.unit.unit],
            unit_measurement: [order.raw_material_inventory?.inventory.unit.measurement],
            price_list: [{value: parseFloat(order.raw_material_inventory?.inventory.price_list ?? '0'), disabled: true}],
            discount_type_1: [{value: order.raw_material_inventory?.discount_type_1, disabled: true}],
            discount_1: [{value: parseFloat(order.raw_material_inventory?.discount_1 ?? '0'), disabled: true}],
            discount_type_2: [{value: order.raw_material_inventory?.discount_type_2, disabled: true}],
            discount_2: [{value: parseFloat(order.raw_material_inventory?.discount_2 ?? '0'), disabled: true }],
            product_cost_1: [{value: parseFloat(order.raw_material_inventory?.product_cost_1 ?? '0'), disabled: true}],
            product_cost_2: [{value: parseFloat(order.raw_material_inventory?.product_cost_2 ?? '0'), disabled: true}],
            total_per_cost: [parseFloat(order.each_product_cost)],
            total_cost: [parseFloat(order.total_product_cost)],
            qty_total: [order.total_qty]
          })
        }

        if(order.type === 'assembly'){
          updateOrder = this.fb.group({
            type: [order.type],
            inventory_id: [order.raw_material_assembly?.id],
            part_number: [order.raw_material_assembly?.id],
            product_code: [order.raw_material_assembly?.no_ref],
            qty: [order.qty],
            price_list: [{value: parseFloat(order.raw_material_assembly?.total_price ?? '0'), disabled: true}],
            total_per_cost: [parseFloat(order.each_product_cost)],
            total_cost: [parseFloat(order.total_product_cost)],
            qty_total: [parseFloat(order.total_qty)]
          })  
        }

        this.order.push(updateOrder);
        this.cpValueChangeSubscriptions(updateOrder)
      })
      
      this.dataDetail.assembly_additional_items.forEach((order) => {
        const updateOrderAdd = this.fb.group({
          id: order.id,
          product_description: order.product_description,
          qty: parseFloat(order.qty),
          unit_id: order.unit.id,
          price_list: parseFloat(order.price_list),
          discount: parseFloat(order.discount),
          discount_type: order.discount_type,
          total_cost: parseFloat(order.total_product_cost),
          measurement: order.unit.measurement,
          unit: order.unit.unit          
        })

        this.orderAdditional.push(updateOrderAdd),
        this.cpValueChangeSubscriptionsAdditional(updateOrderAdd)
      })
    }

    
  }

  getInventoryDescription(order: any, type: string): string {

    if(type === 'assembly'){
      return this.assemblyList?.data?.find((invent: any) => invent.id === order.get('inventory_id')?.value)?.description ?? '';
    }

    return this.inventoryList?.data?.find((invent: any) => invent.id === order.get('inventory_id')?.value)?.description ?? '';
  }

  handleSubmitUnitAdd(): void{

    this.spinnerSvc.show();

    if(this.categoryFormUnit.valid){

      this.apiSvc.createUnitMeasurement(this.categoryFormUnit.value).subscribe({
        next: () => {

          this.spinnerSvc.hide();
          this.modalSvc.success({
            nzTitle: 'Success',
            nzContent: 'Successfully Add Unit',
            nzOkText: 'Ok',
            nzCentered: true
          })
          this.apiSvc.triggerRefreshCategories()
          this.ModalRefUnit?.close();
        },
        error: (error) => {
          this.spinnerSvc.hide();
          this.modalSvc.error({
            nzTitle: 'Unable to Add Unit',
            nzContent: error.error.meta.message,
            nzOkText: 'Ok',
            nzCentered: true
          })
        },
        complete: () => {

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

  
  handleCancelUnitAdd(): void{
    this.ModalRefUnit?.close();
  }

  showModalUnit(titleCat: string): void {

    this.ModalRefUnit = this.modalSvc.create({
      nzTitle: ' Add Unit of Measurment',
      nzContent: EditCategoriesModalComponent,
      nzData: {
        form: this.categoryFormUnit,
        type: titleCat
      },
      nzWidth: '500px',
      nzFooter: [
        {
          label: 'Cancel',
          onClick: () => this.handleCancelUnitAdd(),
          type: 'default'
        },
        {
          label: 'Confirm',
          onClick: () => this.handleSubmitUnitAdd(),
          type: 'primary'
        }
      ]
    });
  }

  submitPurchase(): void{

    this.spinnerSvc.show()


    const picComplete = this.assemblyForm.get('pic')!.value.map((pic_id: any) => ({
      pic_id: pic_id,
      is_pic_internal: pic_id === this.assemblyForm.get('is_pic_internal')!.value ? 1 : 0
    }));

    const inventoryComplete = this.order.value.map((order: any) => ({
      inventory_id: order.type === 'inventory' ? order.inventory_items_id : order.inventory_id,
      qty: order.qty.toString(),
      type: order.type
    }))

    let additionalComplete = null;

    if(this.orderAdditional.length > 0){
      additionalComplete = this.orderAdditional.value.map((order: any) => ({
        id: order.id,
        product_description: order.product_description,
        qty: order.qty.toString(),
        unit_id: order.unit_id.toString(),
        price_list: order.price_list.toString(),
        discount_type: order.discount_type,
        discount: order.discount.toString()
      }))
    }


    if(this.modal_type === 'edit'){
      let body = {
        id: this.assemblyForm.get('id')?.value,
        no_ref: this.assemblyForm.get('no_ref')?.value,
        description: this.assemblyForm.get('description')?.value,
        date: this.assemblyForm.get('date')?.value,
        pic_new: picComplete,
        inventories_new: inventoryComplete,
        additional_items_new: additionalComplete,
        deleted_additional_item_ids: this.deletedOrderAdditional,
        status: this.assemblyForm.get('status')?.value,
        qty: this.assemblyForm.get('qty')?.value.toString()
      }

      this.apiSvc.updateAssembly(body).subscribe({
        next: () => {
          this.spinnerSvc.hide()
          this.apiSvc.triggerRefreshAssembly();
          this.modalSvc.success({
            nzTitle: 'Success',
            nzContent: 'Successfully Edit Assembly Inventory',
            nzOkText: 'Ok',
            nzCentered: true
          })
  
        },
        error: (error) => {
          this.spinnerSvc.hide()
          this.modalSvc.error({
            nzTitle: 'Error',
            nzContent: error.error.meta.message,
            nzOkText: 'Ok',
            nzCentered: true
          })
        },
        complete: () => {
          this.spinnerSvc.hide()
          this.drawerRef.close();
        }
      })
    }


    if(this.modal_type === 'add' || this.modal_type === 'duplicate'){
      let body = {
        id: this.assemblyForm.get('id')?.value,
        no_ref: this.assemblyForm.get('no_ref')?.value,
        description: this.assemblyForm.get('description')?.value,
        date: this.assemblyForm.get('date')?.value,
        pic: picComplete,
        inventories: inventoryComplete,
        additional_items: additionalComplete,
        status: this.assemblyForm.get('status')?.value,
        qty: this.assemblyForm.get('qty')?.value.toString()
      }
      
      
      this.apiSvc.createAssembly(body).subscribe({
        next: () => {
          this.spinnerSvc.hide()
          this.apiSvc.triggerRefreshAssembly();
          this.modalSvc.success({
            nzTitle: 'Success',
            nzContent: 'Successfully Created',
            nzOkText: 'Ok',
            nzCentered: true
          })
  
        },
        error: (error) => {
          this.spinnerSvc.hide()
          this.modalSvc.error({
            nzTitle: 'Error',
            nzContent: error.error.meta.message,
            nzOkText: 'Ok',
            nzCentered: true
          })
        },
        complete: () => {
          this.spinnerSvc.hide()
          this.drawerRef.close();
        }
      })
    }

  }

  calculateTotalCostAdditional(): number{
    let total = 0;
    this.orderAdditional.controls.forEach((group) => {
      const totalCost = group.get('total_cost')?.value;
      total += totalCost ? parseFloat(totalCost) : 0;
    });
    return total;
  }

  calculateTotalCost(): {total: number, totalEach: number} {
    let total = 0;
    let totalEach = 0;
    this.order.controls.forEach((group) => {
      const totalCost = group.get('total_cost')?.value;
      total += totalCost ? parseFloat(totalCost) : 0;
    });

    this.order.controls.forEach((group) => {
      const totalCost = group.get('total_per_cost')?.value;
      totalEach += totalCost ? parseFloat(totalCost) : 0;
    })
    return { total, totalEach };
  }

  closeDrawer(){
    this.drawerRef.close();
  }

  updateTotalCostAdditional(orderRow: UntypedFormGroup): void{
    const qty = orderRow.get('qty')?.value || 0;
    const discount = orderRow.get('discount')?.value || 0;
    const price_list = orderRow.get('price_list')?.value || 0;
    let totalCost = orderRow.get('total_cost')?.value || 0;

    totalCost = price_list * qty

    if(orderRow.get('discount_type')?.value === 'percent'){
      totalCost = totalCost - (totalCost * (parseFloat(discount)/100))
    }

    if(orderRow.get('discount_type')?.value === 'price'){
      totalCost = totalCost - parseFloat(discount);
    }

    orderRow.get('total_cost')?.setValue(totalCost, { emitEvent: false });
  }

  updateTotalCost(orderRow: UntypedFormGroup): void {
    const type = orderRow.get('type')?.value;
    const qtyAssembly = this.assemblyForm.get('qty')?.value || 0;
    const qty = orderRow.get('qty')?.value || 0;
    const productCost = orderRow.get('product_cost_2')?.value || 0;

    let priceList = 0
    let totalPerCost = 0
    let totalQty = 0
    let totalCost = 0

    if(type === 'assembly'){
      priceList = orderRow.get('price_list')?.value;
      totalPerCost = qty * priceList;
      totalQty = qty * qtyAssembly;
      totalCost = totalQty * priceList
    }

    if(type === 'inventory'){
      totalPerCost = qty * productCost;
      totalQty = qty * qtyAssembly;
      totalCost = totalQty * totalPerCost;
      totalCost = totalQty * productCost
    }


    orderRow.get('qty_total')?.setValue(totalQty, { emitEvent: false });
    orderRow.get('total_per_cost')?.setValue(totalPerCost, { emitEvent: false });
    orderRow.get('total_cost')?.setValue(totalCost, { emitEvent: false });
  }

  cpValueChangeSubscriptionsAdditional(control: UntypedFormGroup){
    control.get('unit_id')?.valueChanges.subscribe(res => {
      const selectedUnit = this.unitList.filter(u => u.id === res).map(u => ({
        measurement: u.measurement,
        unit: u.unit 
      }))

      control.patchValue({
        measurement: selectedUnit[0].measurement,
        unit: selectedUnit[0].unit
      })
    })


    control.get('qty')?.valueChanges.subscribe(() => this.updateTotalCostAdditional(control));
    control.get('price_list')?.valueChanges.subscribe(() => this.updateTotalCostAdditional(control));
    control.get('discount')?.valueChanges.subscribe(() => this.updateTotalCostAdditional(control))
  }

  cpValueChangeSubscriptions(control: UntypedFormGroup){
    let isUpdating = false;

    control.get('inventory_id')?.valueChanges.subscribe(value => {
      const type = control.get('type')?.value;

      if (!isUpdating) {
        isUpdating = true;
        let product: any;
        if(type === 'inventory'){
          product = this.inventoryList.data.find((p: any) => p.id === value);
        }

        if(type === 'assembly'){
          product = this.assemblyList.data.find((p: any) => p.id === value);          
        }

        control.get('part_number')?.setValue(product?.id, { emitEvent: false });
        this.changeValueOrder(control, product)
        isUpdating = false;
      }
    });
    
    control.get('part_number')?.valueChanges.subscribe(value => {
      const type = control.get('type')?.value;

      if (!isUpdating) {
        isUpdating = true;

        let product;

        if(type === 'inventory'){
          product = this.inventoryList.data.find((p: any) => p.id === value);
        }

        if(type === 'assembly'){
          product = this.assemblyList.data.find((p: any) => p.id === value);          
        }
        control.get('inventory_id')?.setValue(product?.id, { emitEvent: false });
        this.changeValueOrder(control, product)
        isUpdating = false;
      }
    });


    // Disable the controls after setting values
    // control.get('product_cost')?.disable({ emitEvent: false, onlySelf: true });
    // control.get('product_code')?.disable({ emitEvent: false, onlySelf: true });

    // control.get('discount')?.disable({emitEvent: false, onlySelf: true });
    // control.get('discount_price')?.disable({emitEvent: false, onlySelf: true});
    // control.get('discount_type')?.disable({emitEvent: false, onlySelf: true});
    // control.get('price_list')?.disable({emitEvent: false, onlySelf: true});


    control.get('qty')?.valueChanges.subscribe(() => this.updateTotalCost(control));
    this.assemblyForm.get('qty')?.valueChanges.subscribe(() => this.updateTotalCost(control));

    control.get('supplier')?.valueChanges.subscribe(supplierId => {
      const type = control.get('type')?.value;
      
      if(type === 'inventory'){
        const selectedProduct = this.inventoryList.data.find((p: any) => p.id === control.get('inventory_id')?.value);
        const selectedInventoryItems = selectedProduct?.inventory_items.find((item: any) => item.id === supplierId);
      
        // Update form control with selling price or handle it as needed
        control.get('inventory_items_id')?.setValue(selectedInventoryItems.id);
        // control.get('price_list')?.setValue(20000);
        control.get('discount_type_1')?.setValue(selectedInventoryItems.discount_type_1);
        control.get('discount_1')?.setValue(parseFloat(selectedInventoryItems.discount_1));
        control.get('discount_type_2')?.setValue(selectedInventoryItems.discount_type_2);
        control.get('discount_2')?.setValue(parseFloat(selectedInventoryItems.discount_2));
  
        control.get('product_cost_1')?.setValue(parseFloat(selectedInventoryItems.product_cost_1));
        control.get('product_cost_2')?.setValue(parseFloat(selectedInventoryItems.product_cost_2));
      }

      this.updateTotalCost(control)

    });
  }

  changeValueOrder(control: UntypedFormGroup, product: any){
    const type = control.get('type')?.value;

    if(type === 'inventory'){
      control.get('price_list')?.setValue(parseFloat(product?.price_list));
      control.get('unit_measurement')?.setValue(product?.unit.measurement);
      control.get('unit_unit')?.setValue(product?.unit.unit);
  
      control.get('supplier')?.setValue(null); // Reset supplier on product change
      control.get('suppliersList')?.setValue(product?.inventory_items);

      control.get('product_code')?.setValue(product?.code)
    }

    if(type === 'assembly'){
      control.get('price_list')?.setValue(parseFloat(product?.total_price));
      control.get('product_code')?.setValue(product?.no_ref)
    }

  }

  get order(): UntypedFormArray {
    return this.assemblyForm.get('order') as UntypedFormArray;
  }

  get orderAdditional(): UntypedFormArray{
    return this.assemblyForm.get('order_additional') as UntypedFormArray;
  }

  formatter = (value: number | null): string => {
    return value !== null ? `${value.toLocaleString('en-US')}` : '';
  }; 
  
  
  addOrderAdditional(): void{
    const newOrderAdditional = this.fb.group({
      id: [''],
      product_description: ['',[Validators.required]],
      qty: [0, [Validators.required]],
      unit_id: ['',[Validators.required]],
      price_list: [0, [Validators.required]],
      discount: [0],
      discount_type: ['percent', [Validators.required]],
      total_cost: [0],
      measurement: [''],
      unit: ['']
    })

    this.orderAdditional.push(newOrderAdditional)
    
    this.cpValueChangeSubscriptionsAdditional(newOrderAdditional);
  }

  addOrder(): void {
    const newOrder = this.fb.group({
      type: ['inventory'],
      inventory_id: ['', Validators.required],
      inventory_items_id: [''],
      supplier: [''],
      suppliersList: [[]],
      part_number: [''],
      product_code: [''],
      qty: ['', Validators.required],
      unit_unit: [''],
      unit_measurement: [''],
      price_list: [{value: '', disabled: true}],
      discount_type_1: [{value: 'percent', disabled: true}],
      discount_1: [{value: '', disabled: true}],
      product_cost_1: [{value: '', disabled: true}],
      product_cost_2: [{value: '', disabled: true}],
      discount_type_2: [{value: 'percent', disabled: true}],
      discount_2: [{value: '', disabled: true}],
      total_per_cost: [''],
      total_cost: [''],
      qty_total: ['']
    });

    this.order.push(newOrder);

    this.cpValueChangeSubscriptions(newOrder);
  }

  removeOrderAdditional(index: number): void{
    this.deletedOrderAdditional.push(this.orderAdditional.at(index).get('id')?.value);
    this.orderAdditional.removeAt(index);
  }

  removeOrder(index: number): void {
    // if(index === 0){
    //   return;
    // } 

    this.order.removeAt(index);
  }

}
