const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { auth } = require('../middleware/auth');
const ExcelJS = require('exceljs');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Configuração do Multer para upload de arquivos
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limite
  },
  fileFilter: (req, file, cb) => {
    // Aceitar apenas arquivos Excel
    if (
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.mimetype === 'application/vnd.ms-excel'
    ) {
      cb(null, true);
    } else {
      cb(new Error('Formato de arquivo não suportado. Envie um arquivo Excel.'));
    }
  }
});

// Rota para obter todos os produtos
router.get('/', auth, async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    res.status(500).json({ error: 'Erro ao buscar produtos' });
  }
});

// Rota para importar produtos de Excel
router.post('/import/excel', auth, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo foi enviado' });
  }

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(req.file.path);
    
    const worksheet = workbook.getWorksheet(1); // Primeira planilha
    
    if (!worksheet) {
      return res.status(400).json({ error: 'A planilha não contém dados' });
    }
    
    const productsToCreate = [];
    const errors = [];
    let rowCount = 0;
    let successCount = 0;
    
    // Pular a primeira linha (cabeçalho)
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return; // Pular cabeçalho
      
      rowCount++;
      
      try {
        // Suponha que as colunas sejam:
        // A: Nome, B: Descrição, C: Categoria, D: Peso, E: Quantidade
        // F: Preço de Custo, G: Preço de Venda, H: Preço iFood
        const name = row.getCell(1).value;
        const description = row.getCell(2).value || '';
        const category = row.getCell(3).value;
        const weight = row.getCell(4).value;
        const quantity = parseInt(row.getCell(5).value) || 0;
        const costPrice = parseFloat(row.getCell(6).value) || 0;
        const sellingPrice = parseFloat(row.getCell(7).value) || 0;
        const ifoodPrice = parseFloat(row.getCell(8).value) || 0;
        
        // Validações básicas
        if (!name || !category || costPrice <= 0 || sellingPrice <= 0) {
          errors.push(`Linha ${rowNumber}: Dados inválidos (nome, categoria, e preços são obrigatórios)`);
          return;
        }
        
        // Validação de categoria
        const validCategories = ['Frango', 'Carne', 'Peixe', 'Vegetariano'];
        if (!validCategories.includes(category)) {
          errors.push(`Linha ${rowNumber}: Categoria '${category}' inválida. Use: ${validCategories.join(', ')}`);
          return;
        }
        
        // Adicionar produto à lista para criar
        productsToCreate.push({
          name,
          description,
          category,
          weight,
          quantity,
          costPrice,
          sellingPrice,
          ifoodPrice,
          isActive: true
        });
        
        successCount++;
      } catch (error) {
        errors.push(`Linha ${rowNumber}: ${error.message}`);
      }
    });
    
    // Inserir produtos no banco de dados
    if (productsToCreate.length > 0) {
      await Product.insertMany(productsToCreate);
    }
    
    // Limpar o arquivo temporário
    fs.unlinkSync(req.file.path);
    
    res.json({
      message: `Importação concluída. ${successCount} produtos importados.`,
      total: rowCount,
      success: successCount,
      errors: errors
    });
  } catch (error) {
    console.error('Erro ao importar produtos:', error);
    
    // Limpar o arquivo temporário em caso de erro
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ error: 'Erro ao importar produtos do Excel' });
  }
});

// Rota para exportar produtos para Excel
router.get('/export/excel', auth, async (req, res) => {
  try {
    const products = await Product.find();
    
    if (products.length === 0) {
      return res.status(404).json({ error: 'Não há produtos cadastrados para exportar' });
    }
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Produtos');
    
    // Definir cabeçalhos
    worksheet.columns = [
      { header: 'Nome', key: 'name', width: 30 },
      { header: 'Descrição', key: 'description', width: 50 },
      { header: 'Categoria', key: 'category', width: 15 },
      { header: 'Peso', key: 'weight', width: 10 },
      { header: 'Quantidade', key: 'quantity', width: 12 },
      { header: 'Preço de Custo', key: 'costPrice', width: 15 },
      { header: 'Preço de Venda', key: 'sellingPrice', width: 15 },
      { header: 'Preço iFood', key: 'ifoodPrice', width: 15 },
      { header: 'Margem (%)', key: 'marginPercentage', width: 15 },
      { header: 'Valor Margem', key: 'marginValue', width: 15 },
      { header: 'Status', key: 'status', width: 10 },
      { header: 'Data de Criação', key: 'createdAt', width: 20 }
    ];
    
    // Estilo para os cabeçalhos
    worksheet.getRow(1).font = { bold: true };
    
    // Adicionar dados
    products.forEach(product => {
      // Calcular margem de lucro
      const marginValue = product.sellingPrice - product.costPrice;
      const marginPercentage = product.costPrice > 0 
        ? ((product.sellingPrice - product.costPrice) / product.costPrice) * 100 
        : 0;
      
      worksheet.addRow({
        name: product.name,
        description: product.description,
        category: product.category,
        weight: product.weight,
        quantity: product.quantity,
        costPrice: product.costPrice,
        sellingPrice: product.sellingPrice,
        ifoodPrice: product.ifoodPrice,
        marginPercentage: marginPercentage,
        marginValue: marginValue,
        status: product.isActive ? 'Ativo' : 'Inativo',
        createdAt: new Date(product.createdAt).toLocaleDateString('pt-BR')
      });
    });
    
    // Formatar colunas de preço para exibir como moeda
    ['costPrice', 'sellingPrice', 'ifoodPrice', 'marginValue'].forEach(col => {
      worksheet.getColumn(col).numFmt = 'R$#,##0.00';
    });
    
    // Formatar coluna de percentual
    worksheet.getColumn('marginPercentage').numFmt = '0.00%';
    
    // Definir tipo de resposta e headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=produtos.xlsx');
    
    // Gerar e enviar o arquivo
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Erro ao exportar produtos para Excel:', error);
    res.status(500).json({ error: 'Erro ao exportar produtos para Excel' });
  }
});

// Rota para obter um produto específico
router.get('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }
    res.json(product);
  } catch (error) {
    console.error('Erro ao buscar produto:', error);
    res.status(500).json({ error: 'Erro ao buscar produto' });
  }
});

// Rota para criar um novo produto
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, category, costPrice, sellingPrice, ifoodPrice, quantity, weight, expirationDate } = req.body;

    const newProduct = new Product({
      name,
      description,
      category,
      costPrice,
      sellingPrice,
      ifoodPrice,
      quantity,
      weight,
      expirationDate
    });

    await newProduct.save();
    res.status(201).json(newProduct);
  } catch (error) {
    console.error('Erro ao criar produto:', error);
    res.status(400).json({ error: 'Erro ao criar produto' });
  }
});

// Rota para atualizar um produto
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, description, category, costPrice, sellingPrice, ifoodPrice, quantity, weight, expirationDate } = req.body;
    
    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      {
        name,
        description,
        category,
        costPrice,
        sellingPrice,
        ifoodPrice,
        quantity,
        weight,
        expirationDate,
        updatedAt: Date.now()
      },
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    res.json(updatedProduct);
  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    res.status(400).json({ error: 'Erro ao atualizar produto' });
  }
});

// Rota para alternar o status de um produto
router.patch('/:id/toggle-status', auth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }
    
    product.isActive = !product.isActive;
    product.updatedAt = Date.now();
    
    await product.save();
    
    res.json(product);
  } catch (error) {
    console.error('Erro ao alternar status do produto:', error);
    res.status(500).json({ error: 'Erro ao alternar status do produto' });
  }
});

// Rota para deletar um produto
router.delete('/:id', auth, async (req, res) => {
  try {
    const deletedProduct = await Product.findByIdAndDelete(req.params.id);
    
    if (!deletedProduct) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    res.json({ message: 'Produto deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar produto:', error);
    res.status(500).json({ error: 'Erro ao deletar produto' });
  }
});

module.exports = router; 